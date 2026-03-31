import { Inter } from "next/font/google";
import "./globals.css";
import AppThemeProvider from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Saliheen CRM",
  description: "CRM dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen font-sans antialiased`}>
        <AppThemeProvider>
          {children}
        </AppThemeProvider>
      </body>
    </html>
  );
}
