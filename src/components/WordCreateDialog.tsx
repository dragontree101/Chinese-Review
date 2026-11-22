"use client";

import { useState } from "react";
import type { Word } from "@/lib/types";

interface Props {
  /** 保存成功后回调（列表头部插入新词条） */
  onCreated: (w: Word) => void;
  onClose: () => void;
}

const GRADES = ["七年级", "八年级", "九年级", "拓展", ""] as const;

const field =
  "w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100";

/** 手动添加词条对话框：char/meaning 必填，其余可选 */
export default function WordCreateDialog({ onCreated, onClose }: Props) {
  const [char, setChar] = useState("");
  const [meaning, setMeaning] = useState("");
  const [sentence, setSentence] = useState("");
  const [keyword, setKeyword] = useState("");
  const [source, setSource] = useState("");
  const [lesson, setLesson] = useState("");
  const [grade, setGrade] = useState("");
  const [translation, setTranslation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          char,
          meaning,
          sentence: sentence || undefined,
          keyword: keyword || undefined,
          source: source || null,
          lesson: lesson || null,
          grade: grade || null,
          translation: translation || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `保存失败: ${res.status}`);
      }
      const data = (await res.json()) as { item: Word };
      onCreated(data.item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">添加词条</h3>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">
              字 <span className="text-red-500">*</span>
            </span>
            <input
              value={char}
              onChange={(e) => setChar(e.target.value)}
              placeholder="如：曩"
              className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">读音标注</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="如：辟(bì)，可留空"
              className={field}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">
            含义 <span className="text-red-500">*</span>
          </span>
          <textarea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            rows={2}
            placeholder="如：从前，以往"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">
            例句（建议填写，含句末出处括号）
          </span>
          <textarea
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            rows={2}
            placeholder="如：曩与吾祖居者（《捕蛇者说》）"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">白话翻译</span>
          <textarea
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            rows={2}
            className={field}
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">出处</span>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">课文</span>
            <input
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">年级</span>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className={field}
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g === "" ? "（无）" : g}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving || !char.trim() || !meaning.trim()}
            className="flex-1 rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            {saving ? "保存中……" : "保存"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded border border-gray-300 px-4 py-2 text-gray-700"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
