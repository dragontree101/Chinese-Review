"use client";

import { useState } from "react";
import type { Grade, Word } from "@/lib/types";

interface Props {
  word: Word;
  onSaved: (w: Word) => void;
  onClose: () => void;
}

const GRADES = ["七年级", "八年级", "九年级", "拓展", ""] as const;

/** 词条编辑对话框：translation/lesson/grade/source/meaning */
export default function WordEditDialog({ word, onSaved, onClose }: Props) {
  const [translation, setTranslation] = useState(word.translation ?? "");
  const [lesson, setLesson] = useState(word.lesson ?? "");
  const [grade, setGrade] = useState(word.grade ?? "");
  const [source, setSource] = useState(word.source ?? "");
  const [meaning, setMeaning] = useState(word.meaning);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/words/${word.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          translation: translation || null,
          lesson: lesson || null,
          grade: grade || null,
          source: source || null,
          meaning,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `保存失败: ${res.status}`);
      }
      onSaved({
        ...word,
        translation: translation || null,
        lesson: lesson || null,
        grade: (grade || null) as Grade | null,
        source: source || null,
        meaning,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">
          编辑词条 · {word.char}
          <span className="ml-2 text-sm font-normal text-gray-500">
            #{word.id}
          </span>
        </h3>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">含义</span>
          <textarea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            rows={2}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">例句</span>
          <textarea value={word.sentence} rows={2} className={field} disabled />
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
        <div className="grid grid-cols-2 gap-3">
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
        </div>
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving}
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
