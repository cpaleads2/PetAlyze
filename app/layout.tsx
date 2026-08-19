import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PetAlyze — Understand Your Pet Better with AI",
  description: "Pet journal, digital passport, memories and AI-powered content tools."
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
