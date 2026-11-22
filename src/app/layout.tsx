import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "文言文生词复习",
  description: "帮助初中生学习和复习文言文实词",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <header className="border-b bg-white px-6 py-3">
          <Link href="/" className="text-lg font-semibold">
            文言文生词复习
          </Link>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
