import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DbProvider } from "./context/DbContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DB Env Diff Tool",
  description: "DB environment diff Tool for Comparison",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
   
       <DbProvider>
        {children}
      </DbProvider>
      </body>
    </html>
  );
}
