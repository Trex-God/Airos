"use client";

import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface OutputPanelProps {
  output: string | null;
  isLoading: boolean;
  error: string | null;
}

export function OutputPanel({
  output,
  isLoading,
  error,
}: OutputPanelProps) {
  if (isLoading) {
    return (
      <section
        className="rounded-3xl border border-white/10 bg-white/5 p-6"
        aria-label="Generating task output"
      >
        <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
        <div className="mt-6 space-y-3">
          <div className="h-4 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-rose-400/30 bg-rose-400/10 p-6">
        <p className="text-sm font-semibold text-rose-200">
          Task could not be completed
        </p>
        <p className="mt-2 text-sm leading-6 text-rose-100/80">
          {error}
        </p>
      </section>
    );
  }

  if (!output) {
    return (
      <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Output
        </p>
        <h2 className="mt-3 text-xl font-semibold text-slate-200">
          Your result will appear here.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Run a task from the command center above. When the agent finishes,
          this area becomes your review space for markdown output and files.
        </p>
      </section>
    );
  }

  const sanitizedOutput = DOMPurify.sanitize(output, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
        Agent output
      </p>
      <div className="markdown-output">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {sanitizedOutput}
        </ReactMarkdown>
      </div>
    </section>
  );
}
