import { createClient as createSupabaseClient } from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key){throw new Error("Missing Supabase environment variables. Copy .env.local.example to .env.local and add your Supabase Project URL and Publishable key.");}
export const supabase=createSupabaseClient(url,key);
