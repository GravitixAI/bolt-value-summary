import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "BOLT Value Summary",
  description: "Commercial value summary and salient facts",
  icons: {
    icon: [
      { url: `${bp}/favicon-16x16.png`, sizes: "16x16", type: "image/png" },
      { url: `${bp}/favicon-32x32.png`, sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: `${bp}/apple-icon.png`, sizes: "180x180", type: "image/png" }],
  },
  manifest: `${bp}/site.webmanifest`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
