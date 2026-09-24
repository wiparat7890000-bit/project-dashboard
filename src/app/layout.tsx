import type { Metadata } from "next";
import { Open_Sans, Quicksand } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

// Stack: Quicksand → SF Thonburi (Thai, Apple) → Open Sans → Helvetica Neue → Arial.
// Quicksand/Open Sans have no Thai glyphs, so Thai text falls through to SF Thonburi or the system font.
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project Dashboard | ISD",
  description: "Information System Division — project and task status dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${quicksand.variable} ${openSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
