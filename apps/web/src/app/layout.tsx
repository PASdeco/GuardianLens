import type { Metadata } from "next";
import Script from "next/script";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Guardian Lens",
  description: "Check health products before you trust them.",
  applicationName: "Guardian Lens"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `(function(){try{var t=localStorage.getItem('guardian-lens-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`;
  return <html lang="en" suppressHydrationWarning><body><Script id="guardian-theme" strategy="beforeInteractive">{themeScript}</Script><Providers><PwaRegister /><AppShell>{children}</AppShell></Providers></body></html>;
}
