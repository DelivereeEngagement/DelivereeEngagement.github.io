import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINE OA สำหรับผู้ขนส่งเดลิเวอรี",
  description: "เชื่อมต่อ LINE กับเบอร์โทรศัพท์ที่ลงทะเบียนกับเดลิเวอรี",
  icons: { icon: "/deliveree-logo.png", apple: "/deliveree-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><head><script src="https://static.line-scdn.net/liff/edge/2/sdk.js" defer /></head><body>{children}</body></html>;
}
