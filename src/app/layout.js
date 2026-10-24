import { Geist, Geist_Mono, Noto_Sans_Gujarati } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Gujarati glyphs, only for names and villages that staff type in Gujarati (the UI itself is English).
const notoGujarati = Noto_Sans_Gujarati({ variable: "--font-gujarati", subsets: ["gujarati", "latin"], display: "swap" });

export const metadata = {
  title: { default: "Sankardham", template: "%s | Sankardham" },
  description: "Searchable archive of Pathramani, Vichran and event photographs stored on USB hard disks.",
  robots: { index: false, follow: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${notoGujarati.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
