"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";

import {
  ApiClientError,
  fetchUsage,
  runTask,
  type RunTaskResponse,
} from "@/lib/api";
import {
  USER_TYPES,
  type UserType,
} from "@/lib/domain";

const LOADING_MESSAGES = [
  "Routing your request to the right agent...",
  "The agent is researching and assembling the result...",
  "Running output safety checks...",
] as const;

interface CommandInputProps {
  userType: UserType;
  onUserTypeChange: (userType: UserType) => void;
  onResult: (result: RunTaskResponse) => void;
  onError: (message: string | null) => void;
  onRunningChange: (isRunning: boolean) => void;
}

export function CommandInput({
  userType,
  onUserTypeChange,
  onResult,
  onError,
  onRunningChange,
}: CommandInputProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const usageQuery = useQuery({
    queryKey: ["usage"],
    queryFn: fetchUsage,
  });
  const mutation = useMutation({
    mutationFn: runTask,
    onMutate: () => {
      onError(null);
      onRunningChange(true);
      setLoadingMessageIndex(0);
    },
    onSuccess: async (result) => {
      onResult(result);
      setInput("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["usage"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
    onError: (error: Error) => {
      onError(
        error instanceof ApiClientError
          ? error.message
          : "The task could not be completed.",
      );
    },
    onSettled: () => {
      onRunningChange(false);
    },
  });

  useEffect(() => {
    if (!mutation.isPending) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex(
        (current) => (current + 1) % LOADING_MESSAGES.length,
      );
    }, 5_000);

    return () => window.clearInterval(intervalId);
  }, [mutation.isPending]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoaded || !isSignedIn) {
      onError("Please sign in");
      return;
    }

    const trimmedInput = input.trim();

    if (trimmedInput.length < 3 || mutation.isPending) {
      return;
    }

    mutation.mutate({
      input_text: trimmedInput,
      user_type: userType,
      output_format: "markdown",
    });
  }

  const quotaRemaining = usageQuery.data?.quota_remaining;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Command center
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            What should AI-ROS handle?
          </h2>
        </div>
        <p className="text-sm text-slate-400">
          {typeof quotaRemaining === "number"
            ? `${quotaRemaining} tasks remaining`
            : "Loading usage..."}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" aria-label="Work profile">
        {USER_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onUserTypeChange(type)}
            aria-pressed={userType === type}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
              userType === type
                ? "bg-cyan-300 text-slate-950"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-5">
        <label htmlFor="task-input" className="sr-only">
          Task description
        </label>
        <textarea
          id="task-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={5000}
          rows={7}
          placeholder="Example: Write a 3-tier proposal for a SaaS landing page redesign. Client is a seed-stage founder, budget is $4,000, tone should be confident and concise."
          className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10"
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="text-sm text-slate-400"
            aria-live="polite"
          >
            {mutation.isPending
              ? LOADING_MESSAGES[loadingMessageIndex]
              : `${input.length.toLocaleString()} / 5,000 characters`}
          </p>
          <button
            type="submit"
            disabled={
              mutation.isPending ||
              input.trim().length < 3 ||
              quotaRemaining === 0
            }
            className="rounded-xl bg-cyan-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? "Running task..." : "Run task"}
          </button>
        </div>
      </form>
    </section>
  );
}
