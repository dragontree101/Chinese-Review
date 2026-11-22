import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface RawEntry {
  sentence: string;
}

/** 从 default.json 提取去重后的唯一例句，写入 data/unique-sentences.json */
function main(): void {
  const raw = JSON.parse(
    readFileSync(path.join(process.cwd(), "default.json"), "utf-8"),
  ) as RawEntry[];
  const unique = [...new Set(raw.map((e) => e.sentence))];
  const out = path.join(process.cwd(), "data", "unique-sentences.json");
  writeFileSync(out, JSON.stringify(unique, null, 0), "utf-8");
  console.log(`唯一例句: ${unique.length} 句（总条目 ${raw.length}），已写入 ${out}`);
}

main();
