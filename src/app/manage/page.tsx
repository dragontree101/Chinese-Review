"use client";

import { useEffect, useRef, useState } from "react";
import WordTable from "@/components/WordTable";
import WordEditDialog from "@/components/WordEditDialog";
import type { Word } from "@/lib/types";

const PAGE_SIZE = 20;

export default function ManagePage() {
  const [words, setWords] = useState<Word[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Word | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load(p: number, q: string) {
    setLoading(true);
    fetch(
      `/api/words?page=${p}&pageSize=${PAGE_SIZE}&q=${encodeURIComponent(q)}`,
    )
      .then((r) => r.json() as Promise<{ items: Word[]; total: number }>)
      .then((d) => {
        setWords(d.items);
        setTotal(d.total);
        setPage(p);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleQueryChange(q: string) {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(1, q), 300);
  }

  function handleSaved(updated: Word) {
    setWords((ws) => ws.map((w) => (w.id === updated.id ? updated : w)));
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <WordTable
        words={words}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onQueryChange={handleQueryChange}
        onPageChange={(p) => load(p, query)}
        onEdit={setEditing}
      />
      {loading && (
        <p className="text-center text-sm text-gray-400">加载中……</p>
      )}
      {editing && (
        <WordEditDialog
          word={editing}
          onSaved={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
