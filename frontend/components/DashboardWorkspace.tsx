"use client";

import { UserButton } from "@clerk/nextjs";
import { useState } from "react";

import { AgentStatus } from "@/components/AgentStatus";
import { CommandInput } from "@/components/CommandInput";
import { FileDownload } from "@/components/FileDownload";
import { MemoryPanel } from "@/components/MemoryPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { TaskHistory } from "@/components/TaskHistory";
import type { RunTaskResponse } from "@/lib/api";
import type { UserType } from "@/lib/domain";

interface DashboardWorkspaceProps {
  name: string;
  subscriptionTier: string;
  quotaRemaining?: number;
  quotaTotal?: number;
  isUsageLoading: boolean;
}

const dashboardLinks = [
  { label: "Command", href: "#command" },
  { label: "Output", href: "#output" },
  { label: "History", href: "#history" },
  { label: "Memory", href: "#memory" },
] as const;

const nextSteps = [
  "Pick your work profile.",
  "Describe the outcome you need.",
  "Review the output, file, history, and saved memory.",
] as const;

function formatQuota(
  quotaRemaining: number | undefined,
  quotaTotal: number | undefined,
  isUsageLoading: boolean,
) {
  if (isUsageLoading) {
    return "Loading usage";
  }

  if (
    typeof quotaRemaining === "number" &&
    typeof quotaTotal === "number"
  ) {
    return `${quotaRemaining} / ${quotaTotal} tasks left`;
  }

  return "Usage unavailable";
}

export function DashboardWorkspace({
  name,
  subscriptionTier,
  quotaRemaining,
  quotaTotal,
  isUsageLoading,
}: DashboardWorkspaceProps) {
  const [userType, setUserType] = useState<UserType>("freelancer");
  const [result, setResult] = useState<RunTaskResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quotaLabel = formatQuota(
    quotaRemaining,
    quotaTotal,
    isUsageLoading,
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between py-4">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300 font-black text-slate-950">
              AR
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none">
                AI-ROS
              </span>
              <span className="text-xs text-slate-500">Workspace</span>
            </span>
          </a>

          <nav
            aria-label="Dashboard sections"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1 md:flex"
          >
            {dashboardLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/#pricing"
              className="hidden rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              Plans
            </a>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Welcome, {name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Start at the command center. AI-ROS will route the request,
              display the finished output, and keep your useful context close.
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">Current plan</span>
              <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold capitalize text-cyan-200">
                {subscriptionTier}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">Quota</span>
              <span className="text-sm font-semibold text-white">
                {quotaLabel}
              </span>
            </div>
          </div>
        </section>

        <section
          aria-label="Quick start"
          className="mb-6 grid gap-3 md:grid-cols-3"
        >
          {nextSteps.map((step, index) => (
            <div
              key={step}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-xs font-bold text-cyan-300">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm text-slate-300">{step}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section id="command" className="scroll-mt-28">
              <CommandInput
                userType={userType}
                onUserTypeChange={setUserType}
                onResult={setResult}
                onError={setError}
                onRunningChange={setIsRunning}
              />
            </section>

            <section id="output" className="scroll-mt-28">
              <OutputPanel
                output={result?.output_text ?? null}
                isLoading={isRunning}
                error={error}
              />
            </section>

            {result?.file_url && (
              <FileDownload fileUrl={result.file_url} />
            )}

            <section id="history" className="scroll-mt-28">
              <TaskHistory />
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <AgentStatus
              userType={userType}
              activeAgentId={result?.agent_used ?? null}
              isRunning={isRunning}
            />

            <section id="memory" className="scroll-mt-28">
              <MemoryPanel />
            </section>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">{name}</p>
                  <p className="mt-1 text-xs capitalize text-slate-400">
                    {subscriptionTier} plan
                  </p>
                </div>
                <UserButton afterSignOutUrl="/" />
              </div>
              <a
                href="/#pricing"
                className="mt-4 inline-flex w-full justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Manage plan
              </a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
