import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ls-foundry — GL viewer",
  description: "Showcase for @ls-foundry/gl-viewer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
