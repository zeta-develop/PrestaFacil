import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { AutoUpdater } from "@/components/AutoUpdater";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrestaFácil",
  description: "Gestión de préstamos y cobros",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="mx-auto flex min-h-full max-w-md flex-col shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-x-hidden antialiased selection:bg-teal-500/30">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ReactQueryProvider>
            <AutoUpdater />
            {/* Notificaciones Premium */}
            <Toaster position="top-center" richColors theme="system" />
            {/* Fondo Global */}
            <div className="fixed inset-0 z-0 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-[#09090B] pointer-events-none transition-colors duration-300"></div>
            
            {/* Elementos Decorativos */}
            <div className="fixed top-[-10%] left-[-10%] z-0 h-[40%] w-[60%] rounded-full bg-teal-500/10 dark:bg-teal-500/20 blur-[100px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] z-0 h-[40%] w-[60%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-[100px] pointer-events-none"></div>
            
            {children}
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
