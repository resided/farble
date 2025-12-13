import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FarcasterProvider } from "./components/FarcasterProvider";

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
    "base:app_id": "693c923410053b1bcb25eedc",
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://zarble.vercel.app/logo.png",
      button: {
        title: "⚪ Play",
        action: {
          type: "launch_miniapp",
          url: "https://zarble.vercel.app",
          name: "Zarble",
          splashImageUrl: "https://zarble.vercel.app/logo.png",
          splashBackgroundColor: "#ffffff",
        },
      },
    }),
    "fc:frame": JSON.stringify({
      version: "1",
      imageUrl: "https://zarble.vercel.app/logo.png",
      button: {
        title: "⚪ Play",
        action: {
          type: "launch_frame",
          url: "https://zarble.vercel.app",
          name: "Zarble",
          splashImageUrl: "https://zarble.vercel.app/logo.png",
          splashBackgroundColor: "#ffffff",
        },
      },
    }),
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
        <FarcasterProvider>
          {children}
        </FarcasterProvider>
      </body>
    </html>
  );
}
