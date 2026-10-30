import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jude — Evidence-grounded courtroom intelligence",
  description: "Stay with the testimony. See the whole story. Meet Jude, an evidence-grounded AI courtroom copilot being built for Indonesian legal professionals.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
