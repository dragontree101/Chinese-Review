import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSummary } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default function Home() {
  const s = getSummary(getDb());
  const cards = [
    { label: "总词条", value: String(s.total), href: "/manage" },
    { label: "已复习", value: String(s.reviewed), href: "/stats" },
    {
      label: "正确率",
      value: `${(s.accuracy * 100).toFixed(0)}%`,
      href: "/stats",
    },
  ];

  return (
    <div className="py-10">
      <h1 className="text-center text-3xl font-bold">文言文生词复习</h1>
      <p className="mt-2 text-center text-gray-500">
        每天几分钟，熟悉初中文言文实词
      </p>

      <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg bg-white p-4 text-center shadow hover:shadow-md"
          >
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="mt-1 text-sm text-gray-500">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3">
        <Link
          href="/review"
          className="rounded-lg bg-blue-600 px-6 py-3 text-center font-medium text-white"
        >
          开始复习
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/stats"
            className="rounded-lg bg-white px-6 py-3 text-center shadow hover:shadow-md"
          >
            学习统计
          </Link>
          <Link
            href="/manage"
            className="rounded-lg bg-white px-6 py-3 text-center shadow hover:shadow-md"
          >
            数据管理
          </Link>
        </div>
      </div>
    </div>
  );
}
