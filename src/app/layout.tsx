import type { Metadata } from "next";
import localFont from "next/font/local";

import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import "./globals.css";

const honksansFont = localFont({
  src: [
    {
      path: "./fonts/honk-sans/LFESans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/honk-sans/LFESans-Regular.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/honk-sans/LFESans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/honk-sans/LFESans-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/honk-sans/LFESans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-honksans",
});

const obviouslyFont = localFont({
  src: [
    {
      path: "./fonts/Obviously_Narw_Italic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/Obviously_Narw_Medi_Italic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/Obviously_Narw_Semi_Italic.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/Obviously_Narw_Bold_Bold_Italic.otf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-obviously",
});

export const metadata: Metadata = {
  title: {
    default: "Vistara",
    template: "%s · Vistara",
  },
  description: "Vistara — Window & Door Designer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(honksansFont.variable, obviouslyFont.variable, "h-full font-sans antialiased")}
    >
      <body className="flex min-h-full flex-col bg-brand-backgroundMain text-brand-txt-primary">
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
