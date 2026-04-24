import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura Slice — Slice. Glow. Ascend.",
  description:
    "Aura Slice is a premium casual slicing game. Three modes, satisfying physics, crystalline aura visuals.",
  openGraph: {
    title: "Aura Slice",
    description: "Slice. Glow. Ascend. A premium casual slicing game.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1326",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Epilogue:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;600&family=Space+Grotesk:wght@600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="aura-blob" aria-hidden />
        {children}
      </body>
    </html>
  );
}
