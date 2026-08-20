import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import {
  DynaPuff,
  Righteous,
  Playfair_Display,
  Pacifico,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/Toast";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Display fonts for the per-party "Font theme" picker. Self-hosted at build,
// so they work offline. Kept to a couple of weights each to stay light.
const playful = DynaPuff({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-playful",
});
const boldDisplay = Righteous({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-bold-display",
});
const elegant = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-elegant",
});
const handwritten = Pacifico({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-handwritten",
});

const fontVariables = [
  geistSans.variable,
  geistMono.variable,
  playful.variable,
  boldDisplay.variable,
  elegant.variable,
  handwritten.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Party Day Game Host",
  description:
    "Host party games and banners offline. Bring Me, Family Feud, and Jeopardy with click-to-reveal cards.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Party Day",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#3E47E7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Applied before paint to avoid a flash of the wrong theme.
  const themeScript = `(function(){try{var s=localStorage.getItem('pdgh-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontVariables}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ServiceWorkerRegister />
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
