"use client";

import { useEffect } from "react";

export default function ScrollReveal(){
  useEffect(()=>{
    const nodes=Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if(!nodes.length)return;
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      nodes.forEach(n=>n.classList.add("is-visible"));
      return;
    }
    const observer=new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          (entry.target as HTMLElement).classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.12,rootMargin:"0px 0px -7% 0px"});
    nodes.forEach(n=>observer.observe(n));
    return()=>observer.disconnect();
  },[]);
  return null;
}
