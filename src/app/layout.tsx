import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sheet Manager — Google Sheets in 3 Steps",
  description:
    "Create a Google Sheet, hide selected tabs, and share a view-only link — all in one smooth workflow.",
  keywords: ["google sheets", "sheet manager", "spreadsheet", "google drive"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <meta name="theme-color" content="#f0f0ef" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ height: "100%", margin: 0 }}>{children}</body>
    </html>
  );
}
