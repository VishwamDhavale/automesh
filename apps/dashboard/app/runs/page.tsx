"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { statusBg, timeAgo } from "@/lib/utils";
import { api } from "@/lib/api";

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getRuns();
        setRuns(data);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Execution Runs</h1>
        <p className="text-muted mt-1">Monitor workflow execution history</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-xl animate-shimmer" />)}
        </div>
      ) : runs.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <div className="text-5xl mb-4">▶</div>
          <h3 className="text-lg font-semibold mb-2">No runs yet</h3>
          <p className="text-muted text-sm">Trigger a workflow to see execution logs here</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-medium text-muted border-b border-border uppercase tracking-wider">
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Workflow</div>
            <div className="col-span-3">Run ID</div>
            <div className="col-span-2">Started</div>
            <div className="col-span-2">Completed</div>
          </div>

          {/* Rows */}
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/runs/${run.id}`}
              className="grid grid-cols-12 gap-4 px-5 py-4 text-sm hover:bg-surface-hover transition-all border-b border-border/50 last:border-0"
            >
              <div className="col-span-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusBg(run.status)}`}>
                  {run.status}
                </span>
              </div>
              <div className="col-span-3 font-medium truncate">
                {run.workflowName ?? run.workflowId}
              </div>
              <div className="col-span-3 font-mono text-xs text-muted truncate">
                {run.id}
              </div>
              <div className="col-span-2 text-muted">
                {run.startedAt ? timeAgo(run.startedAt) : "—"}
              </div>
              <div className="col-span-2 text-muted">
                {run.completedAt ? timeAgo(run.completedAt) : "—"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
