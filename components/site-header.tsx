"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Lang="RU"|"UA"|"EN";

export default function SiteHeader(){
  const [loggedIn,setLoggedIn]=useState<boolean|null>(null);
  const [lang,setLang]=useState<Lang>("RU");
  const [languageOpen,setLanguageOpen]=useState(false);
  const menuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let alive=true;
    supabase.auth.getSession().then(({data})=>{if(alive)setLoggedIn(Boolean(data.session));});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setLoggedIn(Boolean(session)));
    const stored=window.localStorage.getItem("petalyze-language") as Lang|null;
    if(stored&&["RU","UA","EN"].includes(stored))setLang(stored);
    const close=(event:MouseEvent)=>{if(menuRef.current&&!menuRef.current.contains(event.target as Node))setLanguageOpen(false)};
    document.addEventListener("mousedown",close);
    return()=>{alive=false;subscription.unsubscribe();document.removeEventListener("mousedown",close);};
  },[]);
  const choose=(next:Lang)=>{
    if(next!=="RU")return;
    setLang(next);window.localStorage.setItem("petalyze-language",next);document.documentElement.lang="ru";setLanguageOpen(false);
  };
  return <header className="site-header-v3">
    <div className="container header-v3-inner">
      <Link href="/" className="brand-lockup" aria-label="PetAlyze home"><img src="/brand/petalyze-icon.png" alt="" className="brand-icon"/><span><b className="brand-pet">Pet</b><b>Alyze</b></span></Link>
      <nav className="header-nav">
        <Link href="/#features">Возможности</Link><Link href="/#showcase">Примеры</Link><Link href="/#ai-studio">AI Studio</Link><Link href="/#how">Как это работает</Link><Link href="/#pricing">Цены</Link>
      </nav>
      <div className="header-actions">
        <div className="language-picker" ref={menuRef}>
          <button className="language-button" type="button" aria-haspopup="menu" aria-expanded={languageOpen} onClick={()=>setLanguageOpen(v=>!v)}><span aria-hidden="true">🌐</span>{lang}<b>⌄</b></button>
          {languageOpen&&<div className="language-menu" role="menu">
            <button className="active" onClick={()=>choose("RU")}><span>RU</span><small>Русский</small><b>✓</b></button>
            <button className="soon" title="Українська версія готується" aria-disabled="true"><span>UA</span><small>Українська</small><em>скоро</em></button>
            <button className="soon" title="English version is coming" aria-disabled="true"><span>EN</span><small>English</small><em>soon</em></button>
          </div>}
        </div>
        {loggedIn ? <Link href="/dashboard" className="btn btn-primary"><span className="desktop-label">Личный кабинет →</span><span className="mobile-label">Кабинет →</span></Link> : <><Link href="/login" className="btn btn-secondary header-login">Войти</Link><Link href="/signup" className="btn btn-primary">Начать бесплатно</Link></>}
      </div>
    </div>
  </header>
}
