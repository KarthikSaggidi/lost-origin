import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lost Origin — Coffee House & Pickleball",
  description:
    "Lost Origin Coffee House. Explore our full coffee and food menu, order takeaway, and book one of four pickleball courts.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
