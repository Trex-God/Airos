"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchTasks } from "@/lib/api";

function formatDate(value: string | null): string {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TaskHistory() {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(
    null,
  );
  const tasksQuery = useQuery({
    queryKey: ["tasks", 1],
    queryFn: () => fetchTasks(1, 20),
  });

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Recent tasks</h2>
          <p className="mt-1 text-xs text-slate-500">
            Reopen previous outputs without leaving the workspace.
          </p>
        </div>
        <span className="text-xs text-slate-500">
          {tasksQuery.data?.total ?? 0} total
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {tasksQuery.isLoading &&
          Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl bg-white/5"
            />
          ))}

        {tasksQuery.isError && (
          <p className="rounded-2xl bg-rose-400/10 p-4 text-sm text-rose-200">
            Task history is temporarily unavailable.
          </p>
        )}

        {tasksQuery.data?.tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-5">
            <p className="text-sm font-medium text-slate-300">
              No tasks yet.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your completed task history will collect here after your first
              command runs.
            </p>
          </div>
        )}

        {tasksQuery.data?.tasks.map((task) => {
          const isExpanded = expandedTaskId === task.id;

          return (
            <article
              key={task.id}
              className="rounded-2xl border border-white/5 bg-slate-950/30 p-4"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedTaskId(isExpanded ? null : task.id)
                }
                className="w-full text-left"
                aria-expanded={isExpanded}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {task.input_text}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {task.task_type.replaceAll("_", " ")} -{" "}
                      {formatDate(task.created_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium capitalize ${
                      task.status === "complete"
                        ? "bg-emerald-400/10 text-emerald-200"
                        : "bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </button>
              {isExpanded && task.output_text && (
                <p className="mt-4 whitespace-pre-wrap border-t border-white/5 pt-4 text-sm leading-6 text-slate-300">
                  {task.output_text}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
