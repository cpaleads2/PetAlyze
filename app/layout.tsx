import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PetAlyze — Understand Your Pet Better with AI",
  description: "AI-powered pet journal, memories, insights and digital pet passport."
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
