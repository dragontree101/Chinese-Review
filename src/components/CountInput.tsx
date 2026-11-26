"use client";

import { useState } from "react";
import { clampCount } from "@/lib/input-parse";

interface Props {
  /** 夹取后的当前值（仅用于「开始」提交） */
  value: number;
  onChange: (v: number) => void;
}

/**
 * 「题目数量」输入框：输入过程不做任何劫持（可清空、可自由编辑），
 * 失焦时才把显示值规范化；提交用的一直是夹取后的数值。
 */
export default function CountInput({ value, onChange }: Props) {
  // 初始显示夹取值；此后输入过程完全由原始文本驱动
  const [text, setText] = useState(String(value));

  return (
    <input
      type="number"
      min={1}
      max={50}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(clampCount(e.target.value));
      }}
      onBlur={() => setText(String(clampCount(text)))}
      className="w-full rounded border border-gray-300 px-3 py-2"
    />
  );
}
