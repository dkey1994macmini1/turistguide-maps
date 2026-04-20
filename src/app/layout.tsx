import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turistguide Maps",
  description: "Mobile-first travel plan viewer with synchronized map",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}