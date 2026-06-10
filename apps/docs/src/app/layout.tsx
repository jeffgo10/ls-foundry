import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ls-foundry — GL viewer",
  description: "Showcase for @jeffgo10/gl-viewer",
};

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

export default RootLayout;
