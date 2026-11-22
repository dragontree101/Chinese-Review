import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

interface RawEntry {
  sentence: string;
}

/** 合并 translations-partN.json 为 data/translations.json，并报告覆盖率 */
function main(): void {
  const root = process.cwd();
  const raw = JSON.parse(
    readFileSync(path.join(root, "default.json"), "utf-8"),
  ) as RawEntry[];
  const unique = [...new Set(raw.map((e) => e.sentence))];

  const merged: Record<string, string> = {};
  for (let i = 1; i <= 4; i++) {
    const partPath = path.join(root, "data", `translations-part${i}.json`);
    if (!existsSync(partPath)) continue;
    const part = JSON.parse(readFileSync(partPath, "utf-8")) as Record<
      string,
      string
    >;
    Object.assign(merged, part);
  }

  const missing = unique.filter((s) => !(s in merged));
  writeFileSync(
    path.join(root, "data", "translations.json"),
    JSON.stringify(merged, null, 0),
    "utf-8",
  );
  console.log(
    `合并完成: ${Object.keys(merged).length} 条翻译，缺 ${missing.length} 句（唯一例句 ${unique.length}）`,
  );
  if (missing.length > 0) {
    console.log("缺失样例:", missing.slice(0, 3));
  }
}

main();
