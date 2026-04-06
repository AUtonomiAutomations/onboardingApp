import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "לוח לקוחות | AutoAgency",
  description: "פורטל קליטת לקוחות — סוכנות אוטומציה B2B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={heebo.className}>
        {children}
        <Toaster richColors position="top-left" />
      </body>
    </html>
  );
}
