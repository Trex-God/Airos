"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { DashboardWorkspace } from "@/components/DashboardWorkspace";
import { fetchUsage } from "@/lib/api";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const usageQuery = useQuery({
    queryKey: ["usage"],
    queryFn: fetchUsage,
    enabled: isLoaded && Boolean(user),
  });

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div
          aria-label="Loading dashboard"
          className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-cyan-300"
        />
      </main>
    );
  }

  return (
    <DashboardWorkspace
      name={user?.fullName ?? user?.firstName ?? "User"}
      subscriptionTier={usageQuery.data?.subscription_tier ?? "free"}
      quotaRemaining={usageQuery.data?.quota_remaining}
      quotaTotal={usageQuery.data?.quota_total}
      isUsageLoading={usageQuery.isLoading}
    />
  );
}
