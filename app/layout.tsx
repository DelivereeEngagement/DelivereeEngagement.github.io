import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deliveree Driver Hub",
  description: "Submit your Deliveree driver registration information through LINE.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><head><script src="https://static.line-scdn.net/liff/edge/2/sdk.js" defer /></head><body>{children}</body></html>;
}
