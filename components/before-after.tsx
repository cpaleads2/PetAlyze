"use client";

import { useState } from "react";

export default function BeforeAfter(){
  const [position,setPosition]=useState(52);
  return <div className="ba-compare" style={{"--ba":`${position}%`} as React.CSSProperties}>
    <img className="ba-image ba-before" src="/showcase/lubopyt-before.jpg" alt="Оригинальная фотография Lubopyt" draggable={false}/>
    <div className="ba-after-wrap"><img className="ba-image ba-after" src="/showcase/lubopyt-after.jpg" alt="AI-иллюстрация Lubopyt" draggable={false}/></div>
    <span className="ba-label ba-label-before">ОРИГИНАЛ</span><span className="ba-label ba-label-after">AI RESULT</span>
    <div className="ba-divider" aria-hidden="true"><span>↔</span></div>
    <input className="ba-range" type="range" min="8" max="92" value={position} onChange={e=>setPosition(Number(e.target.value))} aria-label="Сравнить оригинальную фотографию и AI-иллюстрацию"/>
  </div>;
}
