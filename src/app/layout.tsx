import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Turn a screen recording of a Claude Code session into a captioned reel. Dictate your prompts with Wispr Flow, steer the edit by voice, export in your browser.";

// Link previews need absolute URLs; the preview image itself comes from opengraph-image.png and
// twitter-image.png in this folder.
export const metadata: Metadata = {
  metadataBase: new URL("https://buildreel.vercel.app"),
  title: "Buildreel",
  description,
  openGraph: {
    title: "Buildreel: hours of building, cut to ninety seconds",
    description,
    siteName: "Buildreel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buildreel: hours of building, cut to ninety seconds",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
