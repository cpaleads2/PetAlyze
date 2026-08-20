"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase/client";
export default function AuthGuard({children}:{children:React.ReactNode}){const router=useRouter();const[ready,setReady]=useState(false);useEffect(()=>{supabase.auth.getUser().then(({data})=>{if(!data.user){router.replace("/login");return;}setReady(true);});},[router]);if(!ready)return <div className="flex min-h-[60vh] items-center justify-center text-[var(--muted)]">Loading your PetAlyze workspace…</div>;return <>{children}</>;}
