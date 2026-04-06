import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { TRPCProvider } from "@/src/trpc/client";
import { SidebarNav } from "@/src/components/sidebar-nav";
import { TopBar } from "@/src/components/top-bar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Court Wiki",
    template: "%s | Court Wiki",
  },
  description: "A modern, collaborative knowledge base",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCProvider>
            <div className="flex h-screen overflow-hidden bg-background">
              {/* Sidebar */}
              <aside className="hidden w-64 flex-shrink-0 border-r border-border lg:flex lg:flex-col">
                <div className="flex h-16 items-center border-b border-border px-6">
                  <a href="/" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                      <span className="text-sm font-bold text-primary-foreground">
                        CW
                      </span>
                    </div>
                    <span className="text-lg font-semibold">Court Wiki</span>
                  </a>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <SidebarNav />
                </div>
              </aside>

              {/* Main content */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-y-auto">
                  <div className="container mx-auto max-w-5xl px-6 py-8">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
