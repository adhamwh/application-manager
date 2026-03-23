import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Manager",
  description: "Application management backend and admin frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
