"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { statusBg, timeAgo } from "@/lib/utils";
import { api } from "@/lib/api";

import { ConfirmModal } from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  
  // Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    action: "delete" | "pause" | "resume" | null;
    isProcessing: boolean;
  }>({
    isOpen: false,
    action: null,
    isProcessing: false,
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getWorkflow(id);
        setWorkflow(data);
      } catch {}
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleTrigger() {
    setTriggering(true);
    try {
      await api.triggerWorkflow(id);
      const updated = await api.getWorkflow(id);
      setWorkflow(updated);
    } catch {}
    setTriggering(false);
  }

  const openConfirm = (action: "delete" | "pause" | "resume") => {
    setConfirmState({ isOpen: true, action, isProcessing: false });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleActionConfirm = async () => {
    const { action } = confirmState;
    if (!action) return;

    setConfirmState((prev) => ({ ...prev, isProcessing: true }));

    try {
      if (action === "delete") {
        await api.deleteWorkflow(id);
        router.push("/workflows");
        return; // Don't close modal, we're navigating away
      } else if (action === "pause") {
        const res = await api.pauseWorkflow(id);
        setWorkflow({ ...workflow, status: res.status });
      } else if (action === "resume") {
        const res = await api.resumeWorkflow(id);
        setWorkflow({ ...workflow, status: res.status });
      }
    } catch (err) {
      console.error(`Failed to ${action} workflow:`, err);
    }

    closeConfirm();
  };

  const getModalProps = () => {
    switch (confirmState.action) {
      case "delete":
        return {
          title: "Delete Workflow",
          message: `Are you sure you want to delete "${workflow?.name}"? This is permanent.`,
          confirmText: "Delete",
          type: "danger" as const,
        };
      case "pause":
        return {
          title: "Pause Workflow",
          message: `Are you sure you want to pause "${workflow?.name}"?`,
          confirmText: "Pause",
          type: "warning" as const,
        };
      case "resume":
        return {
          title: "Resume Workflow",
          message: `Are you sure you want to resume "${workflow?.name}"?`,
          confirmText: "Resume",
          type: "info" as const,
        };
      default:
        return { title: "", message: "" };
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-64 rounded-lg animate-shimmer" />
        <div className="h-96 rounded-xl animate-shimmer" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Workflow not found</h2>
        <Link href="/workflows" className="text-accent hover:text-accent-bright text-sm">← Back to workflows</Link>
      </div>
    );
  }

  const definition = workflow.definition;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={handleActionConfirm}
        isLoading={confirmState.isProcessing}
        {...getModalProps()}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/workflows" className="text-sm text-muted hover:text-foreground transition-colors mb-2 inline-block">
            ← Workflows
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{workflow.name}</h1>
            <button
              onClick={() => openConfirm("delete")}
              className="p-1.5 rounded-md text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete Workflow"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {workflow.status === 'paused' && (
              <>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  PAUSED
                </span>
                <span className="text-sm text-muted">•</span>
              </>
            )}
            <span className="text-sm text-muted">Version {workflow.currentVersion}</span>
            <span className="text-sm text-muted">•</span>
            <span className="text-sm text-muted">{workflow.createdAt ? timeAgo(workflow.createdAt) : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => workflow.status === 'paused' ? openConfirm("resume") : openConfirm("pause")}
            className={`px-4 py-2.5 rounded-lg font-medium text-sm border transition-all ${
              workflow.status === 'paused'
                ? 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40'
                : 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40'
            }`}
          >
            {workflow.status === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleTrigger}
            disabled={triggering || workflow.status === 'paused'}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-500 transition-all glow-success disabled:opacity-50"
            title={workflow.status === 'paused' ? "Cannot trigger a paused workflow" : ""}
          >
            {triggering ? "Triggering..." : "▶ Run Now"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Definition */}
        <div className="lg:col-span-2 glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Definition</h2>

          {/* Trigger */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted mb-2">Trigger</h3>
            <div className="p-3 rounded-lg bg-background border border-border">
              {definition?.trigger?.event && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">event</span>
                  <code className="text-sm font-mono">{definition.trigger.event}</code>
                </div>
              )}
              {definition?.trigger?.schedule && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400">cron</span>
                  <code className="text-sm font-mono">{definition.trigger.schedule}</code>
                </div>
              )}
              {definition?.trigger?.manual && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">manual</span>
                  <span className="text-sm">Manual trigger enabled</span>
                </div>
              )}
            </div>
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">Steps</h3>
            <div className="space-y-2">
              {definition?.steps?.map((step: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-accent">{i + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <code className="text-sm font-mono font-medium">{step.action}</code>
                    {step.id && <span className="text-xs text-muted ml-2">(id: {step.id})</span>}
                    {step.input && (
                      <pre className="text-xs text-muted mt-1 font-mono overflow-x-auto">
                        {JSON.stringify(step.input, null, 2)}
                      </pre>
                    )}
                    {step.retry && (
                      <div className="mt-1 text-xs text-amber-400">
                        Retry: {step.retry.attempts}x, delay {step.retry.delay}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Versions & Runs */}
        <div className="space-y-6">
          {/* Versions */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3">Versions</h3>
            <div className="space-y-2">
              {(workflow.versions ?? []).slice(0, 5).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono">v{v.version}</span>
                  <span className="text-xs text-muted">{v.createdAt ? timeAgo(v.createdAt) : ""}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Runs */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3">Recent Runs</h3>
            {(workflow.recentRuns ?? []).length === 0 ? (
              <p className="text-sm text-muted">No runs yet</p>
            ) : (
              <div className="space-y-2">
                {(workflow.recentRuns ?? []).map((run: any) => (
                  <Link
                    key={run.id}
                    href={`/runs/${run.id}`}
                    className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-surface-hover transition-all"
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusBg(run.status)}`}>
                      {run.status}
                    </span>
                    <span className="text-xs text-muted">{run.startedAt ? timeAgo(run.startedAt) : ""}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
