import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AuthProvider } from "@/components/providers/AuthProvider";
import {
  greatVibes,
  inter,
  oxanium,
  marcellus,
} from "./fonts";



export const metadata: Metadata = {
  title: "Chef Rah's Twisted Kitchen",
  description: "Custom ordering website for Chef Rah's Twisted Kitchen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVariables = [
    inter.variable,
    greatVibes.variable,
    oxanium.variable,
    marcellus.variable
  ].join(" ");

  return (
    <html lang="en" className={fontVariables}>
      <body className="antialiased">
        <AuthProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}