import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth-provider";
import { AppShell } from "@/components/shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "Klinthru",
  description: "Pipeline Integrity and Corrosion Prediction Platform - Phase 1"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
