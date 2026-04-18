import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Launchpad — Your job search, sorted",
  description:
    "Tailored resumes and cover letters in minutes. Land the job you actually want.",
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
