import type { Metadata } from "next";

import { Providers } from "@/components/Providers";
import ClerkProvider from "./clerk-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI-ROS",
    template: "%s | AI-ROS",
  },
  description:
    "Gemini-powered AI agents for freelancers, founders, and creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ClerkProvider>{children}</ClerkProvider>
        </Providers>
      </body>
    </html>
  );
}
