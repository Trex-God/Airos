"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchAgents } from "@/lib/api";
import type { UserType } from "@/lib/domain";

interface AgentStatusProps {
  userType: UserType;
  activeAgentId: string | null;
  isRunning: boolean;
}

export function AgentStatus({
  userType,
  activeAgentId,
  isRunning,
}: AgentStatusProps) {
  const agentsQuery = useQuery({
    queryKey: ["agents", userType],
    queryFn: () => fetchAgents(userType),
  });

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Agent team</h2>
        <span className="text-xs capitalize text-slate-400">
          {userType}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {agentsQuery.isLoading &&
          Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        {agentsQuery.data?.agents.map((agent) => {
          const isActive =
            isRunning ||
            activeAgentId === agent.id ||
            activeAgentId === agent.name;

          return (
            <div
              key={agent.id}
              className={`rounded-2xl border p-3 transition ${
                isActive
                  ? "border-cyan-300/40 bg-cyan-300/10"
                  : "border-white/5 bg-slate-950/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isActive
                      ? "animate-pulse bg-cyan-300"
                      : "bg-slate-600"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium">{agent.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {agent.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
