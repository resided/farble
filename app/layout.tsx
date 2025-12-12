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

export const metadata: Metadata = {
  title: "Marble Race - Onchain Racing Game",
  description: "Race marbles onchain. Join a lobby, place your bet, and watch the race unfold.",
  openGraph: {
    title: "Marble Race",
    description: "Race marbles onchain. Join a lobby, place your bet, and watch the race unfold.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marble Race",
    description: "Race marbles onchain. Join a lobby, place your bet, and watch the race unfold.",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  other: {
    "farcaster:frame": "vNext",
    "farcaster:frame:image": "/og-image.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
