-- PetAlyze v0.11.0b — Tranzzo Webhook + Idempotency
-- Run once in Supabase SQL Editor.
-- Does not enable checkout and does not perform any real payment.

begin;

create table if not exists public.tranzzo_payment_orders (
  order_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  billing_interval text not null check (billing_interval in ('monthly','annual')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null,
  status text not null default 'pending'
    check (status in ('pending','paid','failed')),
  payment_id text,
  recurring_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.tranzzo_webhook_events (
  event_key text primary key,
  payment_id text not null,
  order_id text not null,
  payment_status text not null,
  raw_event jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create index if not exists tranzzo_payment_orders_user_idx
  on public.tranzzo_payment_orders(user_id, created_at desc);

create index if not exists tranzzo_webhook_events_order_idx
  on public.tranzzo_webhook_events(order_id, processed_at desc);

alter table public.tranzzo_payment_orders enable row level security;
alter table public.tranzzo_webhook_events enable row level security;

-- No browser policies: payment tables are server-only.

create or replace function public.petalyze_register_tranzzo_order(
  p_order_id text,
  p_user_id uuid,
  p_plan_code text,
  p_billing_interval text,
  p_amount numeric,
  p_currency text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_plan_code not in ('plus','pro') then
    raise exception 'Invalid paid plan';
  end if;
  if p_billing_interval not in ('monthly','annual') then
    raise exception 'Invalid billing interval';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;
  if upper(coalesce(p_currency,'')) <> 'USD' then
    raise exception 'Invalid currency';
  end if;

  insert into public.tranzzo_payment_orders(
    order_id, user_id, plan_code, billing_interval, amount, currency
  )
  values (
    p_order_id, p_user_id, p_plan_code, p_billing_interval,
    round(p_amount,2), upper(p_currency)
  );
end;
$$;

create or replace function public.petalyze_process_tranzzo_webhook(
  p_event_key text,
  p_payment_id text,
  p_order_id text,
  p_status text,
  p_amount numeric,
  p_currency text,
  p_recurring_id text,
  p_raw_event jsonb
)
returns table (
  result text,
  order_id text,
  plan_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.tranzzo_payment_orders%rowtype;
begin
  -- Atomic deduplication. Duplicate delivery exits before any credit mutation.
  insert into public.tranzzo_webhook_events(
    event_key, payment_id, order_id, payment_status, raw_event
  )
  values (
    p_event_key, p_payment_id, p_order_id, p_status, coalesce(p_raw_event,'{}'::jsonb)
  )
  on conflict (event_key) do nothing;

  if not found then
    return query select 'duplicate'::text, p_order_id, null::text;
    return;
  end if;

  select o.*
    into v_order
  from public.tranzzo_payment_orders o
  where o.order_id = p_order_id
  for update;

  if not found then
    raise exception 'Unknown Tranzzo order';
  end if;

  -- Only a successful provider transaction can activate a paid plan.
  if lower(p_status) <> 'success' then
    update public.tranzzo_payment_orders
       set status = 'failed',
           payment_id = p_payment_id
     where tranzzo_payment_orders.order_id = p_order_id;

    return query select 'ignored_non_success'::text, p_order_id, v_order.plan_code;
    return;
  end if;

  -- Never trust plan/price/user values echoed by a webhook payload.
  -- Compare provider money fields to our server-created order.
  if p_amount is null or round(p_amount,2) <> round(v_order.amount,2) then
    raise exception 'Tranzzo amount mismatch';
  end if;
  if upper(coalesce(p_currency,'')) <> upper(v_order.currency) then
    raise exception 'Tranzzo currency mismatch';
  end if;

  if v_order.status = 'paid' then
    return query select 'already_paid'::text, p_order_id, v_order.plan_code;
    return;
  end if;

  -- Existing v0.10.2c trusted activation RPC runs inside this same DB transaction.
  perform public.petalyze_activate_subscription(
    v_order.user_id,
    v_order.plan_code,
    v_order.billing_interval,
    'tranzzo',
    v_order.user_id::text,
    p_recurring_id
  );

  update public.tranzzo_payment_orders
     set status = 'paid',
         payment_id = p_payment_id,
         recurring_id = p_recurring_id,
         paid_at = now()
   where tranzzo_payment_orders.order_id = p_order_id;

  return query select 'activated'::text, p_order_id, v_order.plan_code;
end;
$$;

revoke all on table public.tranzzo_payment_orders from anon, authenticated;
revoke all on table public.tranzzo_webhook_events from anon, authenticated;

revoke all on function public.petalyze_register_tranzzo_order(text,uuid,text,text,numeric,text)
  from public, anon, authenticated;
revoke all on function public.petalyze_process_tranzzo_webhook(text,text,text,text,numeric,text,text,jsonb)
  from public, anon, authenticated;

grant execute on function public.petalyze_register_tranzzo_order(text,uuid,text,text,numeric,text)
  to service_role;
grant execute on function public.petalyze_process_tranzzo_webhook(text,text,text,text,numeric,text,text,jsonb)
  to service_role;

commit;
