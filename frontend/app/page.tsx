"use client";

import { useUser } from "@clerk/nextjs";

interface AuthCtaProps {
  className: string;
  isLoaded: boolean;
  isSignedIn: boolean;
  signedOutLabel: string;
  signedInLabel?: string;
}

const navItems = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Agents", href: "#agents" },
  { label: "Pricing", href: "#pricing" },
] as const;

const workflowSteps = [
  {
    step: "01",
    title: "Describe the outcome",
    body: "Start with the task, context, and constraints. AI-ROS handles routing.",
  },
  {
    step: "02",
    title: "Agent takes over",
    body: "The right specialist agent drafts the work and checks the result.",
  },
  {
    step: "03",
    title: "Save the useful context",
    body: "Finished work, history, and durable memory stay available for the next run.",
  },
] as const;

const agentPaths = [
  "Client acquisition",
  "Proposal and sales",
  "Delivery",
  "Communication",
  "Admin and finance",
] as const;

function AuthCta({
  className,
  isLoaded,
  isSignedIn,
  signedOutLabel,
  signedInLabel = "Go to Dashboard",
}: AuthCtaProps) {
  if (isLoaded && isSignedIn) {
    return (
      <a href="/dashboard" className={className}>
        {signedInLabel}
      </a>
    );
  }

  return (
    <a href="/login" className={className}>
      {signedOutLabel}
    </a>
  );
}

export default function Home() {
  const { user, isLoaded } = useUser();
  const isSignedIn = Boolean(user);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 px-6 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between py-4">
          <a href="#" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300 font-black text-slate-950">
              AR
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none">
                AI-ROS
              </span>
              <span className="text-xs text-slate-500">
                Research Operating System
              </span>
            </span>
          </a>

          <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          <AuthCta
            isLoaded={isLoaded}
            isSignedIn={isSignedIn}
            signedOutLabel="Start free"
            signedInLabel="Dashboard"
            className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          />
        </nav>
      </header>

      <section className="mx-auto grid min-h-[78vh] max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            AI Research Operating System
          </p>
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl">
            One command. The right AI agent. Finished work.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            AI-ROS gives freelancers, founders, and creators a secure workspace
            for turning messy requests into usable business deliverables.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <AuthCta
              isLoaded={isLoaded}
              isSignedIn={isSignedIn}
              signedOutLabel="Start free - 5 tasks"
              className="rounded-xl bg-cyan-300 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-200"
            />
            <a
              href="#how-it-works"
              className="rounded-xl border border-white/15 px-6 py-3 text-center font-semibold text-white transition hover:bg-white/10"
            >
              See the flow
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-cyan-950/20">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Workspace preview
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Find qualified leads for a Webflow freelancer",
                "Draft a three-tier proposal",
                "Turn a client brief into a delivery plan",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-xs font-semibold text-cyan-200">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-6xl scroll-mt-24 border-t border-white/10 px-6 py-20"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
            User flow
          </p>
          <h2 className="mt-3 text-3xl font-bold">
            Built so the next click is always obvious.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {workflowSteps.map((step) => (
            <article
              key={step.step}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <p className="text-sm font-bold text-cyan-300">
                {step.step}
              </p>
              <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 leading-7 text-slate-400">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="agents"
        className="mx-auto max-w-6xl scroll-mt-24 border-t border-white/10 px-6 py-20"
      >
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Agent routing
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              The dashboard starts with one input, then routes the task.
            </h2>
            <p className="mt-4 leading-7 text-slate-400">
              Choose your work profile, describe the job, and AI-ROS sends it
              to the matching workflow. History, files, and memory stay nearby.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {agentPaths.map((path) => (
              <div
                key={path}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm font-medium text-slate-200"
              >
                {path}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="mx-auto max-w-6xl scroll-mt-24 border-t border-white/10 px-6 py-20"
      >
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Plans
          </p>
          <h2 className="mt-3 text-3xl font-bold">
            Start lean. Scale when the work does.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              name: "Starter",
              quota: "100 tasks",
              description: "For consistent solo workflows.",
            },
            {
              name: "Pro",
              quota: "300 tasks",
              description: "For high-volume operators and teams.",
            },
            {
              name: "Agency",
              quota: "500 tasks",
              description: "For multi-client delivery at scale.",
            },
          ].map((plan) => (
            <article
              key={plan.name}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-4 text-3xl font-bold text-cyan-300">
                {plan.quota}
              </p>
              <p className="mt-3 leading-7 text-slate-400">
                {plan.description}
              </p>
              <AuthCta
                isLoaded={isLoaded}
                isSignedIn={isSignedIn}
                signedOutLabel="Get started"
                className="mt-6 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
