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
          <div className="mx-auto flex max-w-4xl items-center gap-6">
            <Link href="/" className="text-lg font-semibold">
              文言文生词复习
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="text-gray-700 hover:text-blue-600">
                文言文
              </Link>
              <Link href="/english" className="text-gray-700 hover:text-blue-600">
                英语单词
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
