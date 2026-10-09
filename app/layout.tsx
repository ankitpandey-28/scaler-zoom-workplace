import type { Metadata } from "next";
import "./globals.css";
import "./workplace.css";
import "./landing.css";
import AuthProvider from "@/components/AuthProvider";
export const metadata: Metadata = {
  title: "Zoom Workplace | Meetings",
  description:
    "Start, join, and schedule video meetings. An original fullstack assignment implementation.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
