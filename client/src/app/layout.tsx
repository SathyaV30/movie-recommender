import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PopcornPal",
  description: "Discover your next favorite movie or tv show with the ultimate recommendation chatbot!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      <link
        rel="icon"
        href={`data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22><text y=%2228%22 font-size=%2232%22>🍿</text></svg>`}
      />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${figtree.variable} antialiased`}
      >
       {children}
      </body>
    </html>
  );
}