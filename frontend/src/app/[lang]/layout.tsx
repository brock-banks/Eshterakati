import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Header, TabBar } from "@/components/Header";
import { IconSprite } from "@/components/IconSprite";
import { UIProvider } from "@/components/UIProvider";
import { dirOf, getDictionary, hasLocale, locales } from "@/i18n";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getPaymentMethods } from "@/lib/api";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { meta } = getDictionary(lang);
  return {
    title: { default: meta.title, template: `%s · ${getDictionary(lang).brand}` },
    description: meta.description,
    alternates: { languages: { ar: "/ar", en: "/en" } },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Applies the saved theme before first paint, avoiding a flash.
const PREFS_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("esh:v2")||"{}");if(s.theme==="light"||s.theme==="dark")document.documentElement.dataset.theme=s.theme}catch(e){}`;

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const paymentMethods = await getPaymentMethods(lang);

  return (
    <html lang={lang} dir={dirOf(lang)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          {dict.nav.skip}
        </a>
        <IconSprite />
        <I18nProvider lang={lang} dict={dict}>
          <UIProvider paymentMethods={paymentMethods}>
            <Header />
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <TabBar />
          </UIProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
