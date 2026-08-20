"use client";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase/client";
export default function LogoutButton(){const router=useRouter();async function logout(){await supabase.auth.signOut();router.replace("/");router.refresh();}return <button onClick={logout} className="sidebar-link w-full text-left">↪ Log out</button>;}
