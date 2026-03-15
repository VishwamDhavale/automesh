"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { statusBg, timeAgo } from "@/lib/utils";
import { api } from "@/lib/api";

export default function OverviewPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [w, r, e] = await Promise.allSettled([
          api.getWorkflows(),
          api.getRuns(),
          api.getEvents(),
        ]);
        if (w.status === "fulfilled") setWorkflows(w.value);
        if (r.status === "fulfilled") setRuns(r.value);
        if (e.status === "fulfilled") setEvents(e.value);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const completedRuns = runs.filter(r => r.status === "completed").length;
  const failedRuns = runs.filter(r => r.status === "failed").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted mt-1">Your automation engine at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Workflows" value={workflows.length} icon="⚡" gradient="from-violet-500/20 to-indigo-500/20" />
        <StatCard label="Total Runs" value={runs.length} icon="▶" gradient="from-blue-500/20 to-cyan-500/20" />
        <StatCard label="Completed" value={completedRuns} icon="✓" gradient="from-emerald-500/20 to-green-500/20" />
        <StatCard label="Failed" value={failedRuns} icon="✕" gradient="from-rose-500/20 to-red-500/20" />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Runs */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Runs</h2>
            <Link href="/runs" className="text-sm text-accent hover:text-accent-bright transition-colors">
              View all →
            </Link>
          </div>
          {loading ? (
            <LoadingSkeleton count={5} />
          ) : runs.length === 0 ? (
            <EmptyState message="No workflow runs yet" />
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 5).map((run) => (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBg(run.status)}`}>
                      {run.status}
                    </span>
                    <span className="text-sm font-medium">{run.workflowName ?? run.workflowId}</span>
                  </div>
                  <span className="text-xs text-muted">{run.startedAt ? timeAgo(run.startedAt) : ""}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Event Activity</h2>
            <Link href="/events" className="text-sm text-accent hover:text-accent-bright transition-colors">
              View all →
            </Link>
          </div>
          {loading ? (
            <LoadingSkeleton count={5} />
          ) : events.length === 0 ? (
            <EmptyState message="No events received yet" />
          ) : (
            <div className="space-y-2">
              {events.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      {event.source}
                    </span>
                    <span className="text-sm font-mono text-muted">{event.eventType}</span>
                  </div>
                  <span className="text-xs text-muted">{event.createdAt ? timeAgo(event.createdAt) : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/workflows"
            className="flex items-center gap-3 p-4 rounded-lg bg-surface-hover/50 hover:bg-surface-hover border border-border-subtle hover:border-accent/30 transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
              ⚡
            </div>
            <div>
              <p className="text-sm font-medium">Create Workflow</p>
              <p className="text-xs text-muted">Define a new automation</p>
            </div>
          </Link>
          <Link
            href="/builder"
            className="flex items-center gap-3 p-4 rounded-lg bg-surface-hover/50 hover:bg-surface-hover border border-border-subtle hover:border-accent/30 transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
              🧩
            </div>
            <div>
              <p className="text-sm font-medium">Visual Builder</p>
              <p className="text-xs text-muted">Drag & drop editor</p>
            </div>
          </Link>
          <Link
            href="/marketplace"
            className="flex items-center gap-3 p-4 rounded-lg bg-surface-hover/50 hover:bg-surface-hover border border-border-subtle hover:border-accent/30 transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
              🏪
            </div>
            <div>
              <p className="text-sm font-medium">Marketplace</p>
              <p className="text-xs text-muted">Browse integrations</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, gradient }: { label: string; value: number; icon: string; gradient: string }) {
  return (
    <div className="glass rounded-xl p-5 hover:glow-accent transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted mb-1">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg animate-shimmer" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-muted text-sm">
      {message}
    </div>
  );
}
