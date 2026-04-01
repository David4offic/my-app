import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "4office sekimas",
  description: "4office remonto uzsakymo sekimas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="lt">
      <body className="antialiased">{children}</body>
    </html>
  );
}
