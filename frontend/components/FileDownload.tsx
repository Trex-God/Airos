"use client";

import { useState } from "react";

interface FileDownloadProps {
  fileUrl: string;
  fileName?: string | null;
}

export function FileDownload({
  fileUrl,
  fileName = "AI-ROS deliverable",
}: FileDownloadProps) {
  const [copied, setCopied] = useState(false);

  function openFile() {
    const target = new URL(fileUrl, window.location.origin);

    if (!["http:", "https:"].includes(target.protocol)) {
      return;
    }

    window.open(target.toString(), "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(fileUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-cyan-100">
          File ready
        </p>
        <p className="mt-1 text-xs text-slate-400">{fileName}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={openFile}
          className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          Open file
        </button>
      </div>
    </section>
  );
}
