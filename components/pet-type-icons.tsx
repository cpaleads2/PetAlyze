import type { ReactNode } from "react";

type Kind="dog"|"cat"|"rabbit"|"bird"|"hamster"|"other";
const common={fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
export default function PetTypeIcon({kind}:{kind:Kind}){
 const shapes:Record<Kind,ReactNode>={
  dog:<><path {...common} d="M7 9 4.5 6.5 4 11c0 5 3 8 8 8s8-3 8-8l-.5-4.5L17 9"/><path {...common} d="M8.5 13h.01M15.5 13h.01M10 16c1.3 1 2.7 1 4 0M10.5 14.5h3"/></>,
  cat:<><path {...common} d="m6 9-1-5 4 3a9 9 0 0 1 6 0l4-3-1 5v4a6 6 0 0 1-12 0Z"/><path {...common} d="M9 12h.01M15 12h.01M10 15c1.3.8 2.7.8 4 0M5 14H2M19 14h3"/></>,
  rabbit:<><path {...common} d="M9 8C7 4 7 1 9 1c2 0 2 4 2 6M15 8c2-4 2-7 0-7-2 0-2 4-2 6"/><path {...common} d="M6 13a6 6 0 0 1 12 0c0 4-2.7 7-6 7s-6-3-6-7Z"/><path {...common} d="M9.5 13h.01M14.5 13h.01M10.5 16h3"/></>,
  bird:<><path {...common} d="M5 15c3-7 8-9 13-6-2 1-3 3-3 5 2 0 4 .7 5 2-5 3-10 3-15-1Z"/><path {...common} d="M9 14c2-1 4-1 6 0M18 9l3-2"/></>,
  hamster:<><circle {...common} cx="12" cy="13" r="6"/><circle {...common} cx="7" cy="8" r="2.5"/><circle {...common} cx="17" cy="8" r="2.5"/><path {...common} d="M9.5 12h.01M14.5 12h.01M10 16c1.3.8 2.7.8 4 0M11 14h2"/></>,
  other:<><path {...common} d="M8.2 10.5c-1.7 0-3-1.5-3-3.2 0-1.4.8-2.3 2-2.3 1.8 0 2.8 2.1 2.5 3.7M15.8 10.5c1.7 0 3-1.5 3-3.2 0-1.4-.8-2.3-2-2.3-1.8 0-2.8 2.1-2.5 3.7"/><path {...common} d="M12 9c3.8 0 6.5 3.2 6.5 6.2 0 2.3-1.7 3.8-4 3.8-1 0-1.8-.4-2.5-1-.7.6-1.5 1-2.5 1-2.3 0-4-1.5-4-3.8C5.5 12.2 8.2 9 12 9Z"/></>
 };
 return <svg viewBox="0 0 24 24" aria-hidden="true">{shapes[kind]}</svg>;
}
