import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Starter",
  description: "Next.js and FastAPI starter for your next project.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
