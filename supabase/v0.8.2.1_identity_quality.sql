-- PetAlyze v0.8.2.1 — identity fidelity tracking

alter table public.ai_creations
add column if not exists input_fidelity text not null default 'high';
