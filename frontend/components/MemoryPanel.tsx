"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { deleteMemory, fetchMemory } from "@/lib/api";
import {
  MEMORY_CATEGORIES,
  type MemoryCategory,
} from "@/lib/domain";

export function MemoryPanel() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<MemoryCategory | undefined>();
  const memoryQuery = useQuery({
    queryKey: ["memory", category ?? "all"],
    queryFn: () => fetchMemory(category),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMemory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["memory"] }),
  });

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div>
        <h2 className="font-semibold">Memory</h2>
        <p className="mt-1 text-xs text-slate-500">
          Durable context AI-ROS can reuse in future workflows.
        </p>
      </div>

      <label htmlFor="memory-category" className="sr-only">
        Filter memory category
      </label>
      <select
        id="memory-category"
        value={category ?? ""}
        onChange={(event) =>
          setCategory(
            (event.target.value || undefined) as
              | MemoryCategory
              | undefined,
          )
        }
        className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-300/50"
      >
        <option value="">All categories</option>
        {MEMORY_CATEGORIES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <div className="mt-4 space-y-3">
        {memoryQuery.isLoading &&
          Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl bg-white/5"
            />
          ))}

        {memoryQuery.isError && (
          <p className="rounded-2xl bg-rose-400/10 p-4 text-sm text-rose-200">
            Memory is temporarily unavailable.
          </p>
        )}

        {memoryQuery.data?.memory_items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-5">
            <p className="text-sm font-medium text-slate-300">
              No saved memory yet.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              After agents finish work, useful facts like clients,
              preferences, and decisions will appear here.
            </p>
          </div>
        )}

        {memoryQuery.data?.memory_items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-white/5 bg-slate-950/30 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                  {item.category}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {item.summary}
                </p>
              </div>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(item.id)}
                className="text-xs text-slate-500 transition hover:text-rose-200 disabled:opacity-50"
                aria-label={`Delete ${item.category} memory`}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
