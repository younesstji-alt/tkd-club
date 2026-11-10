import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLang } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { translate } from "@/lib/i18n/dict";
import { ServiceWorker } from "@/components/ServiceWorker";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: translate(lang, "appName"),
    description: "Attendance & athlete evaluation for a Taekwondo club",
    appleWebApp: { capable: true, title: translate(lang, "appName"), statusBarStyle: "default" },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1e40af",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body className="min-h-dvh font-sans antialiased">
        <I18nProvider lang={lang}>{children}</I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
