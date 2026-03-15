"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { statusBg, statusColor, timeAgo, cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getRun(id);
        setRun(data);
      } catch {}
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-48 rounded-lg animate-shimmer" />
        <div className="h-96 rounded-xl animate-shimmer" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Run not found</h2>
        <Link href="/runs" className="text-accent hover:text-accent-bright text-sm">← Back to runs</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/runs" className="text-sm text-muted hover:text-foreground transition-colors mb-2 inline-block">
          ← Runs
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Run Details</h1>
          <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${statusBg(run.status)}`}>
            {run.status}
          </span>
        </div>
        <p className="text-muted mt-1 font-mono text-sm">{run.id}</p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Workflow</p>
          <p className="font-medium">{run.workflowName ?? run.workflowId}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Started</p>
          <p className="font-medium">{run.startedAt ? timeAgo(run.startedAt) : "—"}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Completed</p>
          <p className="font-medium">{run.completedAt ? timeAgo(run.completedAt) : "—"}</p>
        </div>
      </div>

      {/* Step Timeline */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-6">Step Timeline</h2>

        {(run.steps ?? []).length === 0 ? (
          <p className="text-sm text-muted">No step data available</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-border" />

            <div className="space-y-4">
              {run.steps.map((step: any, i: number) => (
                <div key={step.id ?? i} className="flex items-start gap-4 relative">
                  {/* Timeline dot */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2",
                    step.status === "success" ? "bg-emerald-500/20 border-emerald-500/40" :
                    step.status === "failed" ? "bg-rose-500/20 border-rose-500/40" :
                    step.status === "running" ? "bg-amber-500/20 border-amber-500/40" :
                    "bg-zinc-500/20 border-zinc-500/40"
                  )}>
                    <span className={cn("text-xs font-bold", statusColor(step.status))}>
                      {step.status === "success" ? "✓" : step.status === "failed" ? "✕" : i + 1}
                    </span>
                  </div>

                  {/* Step content */}
                  <div className="flex-1 bg-background rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm font-medium">{step.stepName}</code>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusBg(step.status)}`}>
                          {step.status}
                        </span>
                      </div>
                      <span className="text-xs text-muted">
                        {step.startedAt ? timeAgo(step.startedAt) : ""}
                      </span>
                    </div>
                    {step.error && (
                      <p className="text-xs text-rose-400 mt-2 font-mono bg-rose-500/5 p-2 rounded">
                        {step.error}
                      </p>
                    )}
                    {step.result && (
                      <pre className="text-xs text-muted mt-2 font-mono overflow-x-auto bg-surface p-2 rounded">
                        {JSON.stringify(step.result, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
