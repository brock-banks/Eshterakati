import type { Metadata, Viewport } from "next";
import { Header, TabBar } from "@/components/Header";
import { IconSprite } from "@/components/IconSprite";
import { UIProvider } from "@/components/UIProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Eshterakati — Discounted coupon & gift codes", template: "%s · Eshterakati" },
  description: "Buy verified coupon and gift codes at a discount. Delivered instantly, with a money-back promise.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Applies the saved theme and text direction before first paint, avoiding a flash.
const PREFS_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("esh:v1")||"{}");var r=document.documentElement;if(s.theme==="light"||s.theme==="dark")r.dataset.theme=s.theme;if(s.dir==="rtl")r.dir="rtl"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <IconSprite />
        <UIProvider>
          <Header />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <TabBar />
        </UIProvider>
      </body>
    </html>
  );
}
