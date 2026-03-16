"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { statusBg, timeAgo, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [yamlInput, setYamlInput] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  
  // Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    workflowId: string;
    workflowName: string;
    action: "delete" | "pause" | "resume" | null;
    isProcessing: boolean;
  }>({
    isOpen: false,
    workflowId: "",
    workflowName: "",
    action: null,
    isProcessing: false,
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    try {
      const data = await api.getWorkflows();
      setWorkflows(data);
    } catch {}
    setLoading(false);
  }

  async function handleCreate() {
    if (!yamlInput.trim()) return;
    setCreating(true);
    setError("");
    try {
      await api.createWorkflow(yamlInput);
      setYamlInput("");
      setShowCreate(false);
      await loadWorkflows();
    } catch (err: any) {
      setError(err.message);
    }
    setCreating(false);
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const result = await api.generateWorkflow(aiPrompt);
      setYamlInput(result.yaml);
    } catch (err: any) {
      setError(err.message);
    }
    setGenerating(false);
  }

  const openConfirm = (id: string, name: string, action: "delete" | "pause" | "resume") => {
    setConfirmState({
      isOpen: true,
      workflowId: id,
      workflowName: name,
      action,
      isProcessing: false,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleActionConfirm = async () => {
    const { workflowId, action } = confirmState;
    if (!workflowId || !action) return;

    setConfirmState((prev) => ({ ...prev, isProcessing: true }));

    try {
      if (action === "delete") {
        await api.deleteWorkflow(workflowId);
      } else if (action === "pause") {
        await api.pauseWorkflow(workflowId);
      } else if (action === "resume") {
        await api.resumeWorkflow(workflowId);
      }
      await loadWorkflows();
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
          message: `Are you sure you want to delete "${confirmState.workflowName}"? This will permanently remove the workflow and all its run history.`,
          confirmText: "Delete",
          type: "danger" as const,
        };
      case "pause":
        return {
          title: "Pause Workflow",
          message: `Are you sure you want to pause "${confirmState.workflowName}"? It will stop triggering until you resume it.`,
          confirmText: "Pause Workflow",
          type: "warning" as const,
        };
      case "resume":
        return {
          title: "Resume Workflow",
          message: `Are you sure you want to resume "${confirmState.workflowName}"? It will start triggering again immediately.`,
          confirmText: "Resume Workflow",
          type: "info" as const,
        };
      default:
        return { title: "", message: "" };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted mt-1">Manage your automation workflows</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-bright transition-all duration-200 glow-accent"
        >
          {showCreate ? "Cancel" : "+ New Workflow"}
        </button>
      </div>

      {/* Create Panel */}
      {showCreate && (
        <div className="glass rounded-xl p-6 space-y-4 gradient-border">
          <h2 className="text-lg font-semibold">Create Workflow</h2>

          {/* AI Generator */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">AI Generator</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e: any) => setAiPrompt(e.target.value)}
                placeholder="Describe your workflow in natural language..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-background border border-border focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm transition-all"
              />
              <button
                onClick={handleAiGenerate}
                disabled={generating}
                className="px-4 py-2.5 rounded-lg bg-linear-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50"
              >
                {generating ? "Generating..." : "✨ Generate"}
              </button>
            </div>
          </div>

          {/* YAML Editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">Workflow YAML</label>
            <textarea
              value={yamlInput}
              onChange={(e: any) => setYamlInput(e.target.value)}
              placeholder={`workflow: my_workflow\n\ntrigger:\n  event: stripe.payment_succeeded\n\nsteps:\n  - action: send_email\n    input:\n      to: user@example.com\n      subject: Welcome!`}
              className="w-full h-64 px-4 py-3 rounded-lg bg-background border border-border font-mono text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50 resize-none transition-all"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!yamlInput.trim() || creating}
            className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-bright transition-all disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Workflow"}
          </button>
        </div>
      )}

      {/* Workflows List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl animate-shimmer" />)}
        </div>
      ) : workflows.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <div className="text-5xl mb-4">🔧</div>
          <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
          <p className="text-muted text-sm mb-6">Create your first automated workflow to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-bright transition-all"
          >
            + Create Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {workflows.map((wf) => (
            <Link
              key={wf.id}
              href={`/workflows/${wf.id}`}
              className={`glass glass-hover rounded-xl p-5 flex items-center justify-between group transition-all duration-300 ${wf.status === 'paused' ? 'opacity-70 grayscale-[0.2]' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm font-bold ${wf.status === 'paused' ? 'bg-muted/10 text-muted' : 'bg-linear-to-br from-accent/20 to-purple-500/20 text-accent'}`}>
                  {wf.name?.[0]?.toUpperCase() ?? "W"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold group-hover:text-accent-bright transition-colors">
                      {wf.name}
                    </h3>
                    {wf.status === 'paused' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        PAUSED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted">v{wf.currentVersion}</span>
                    <span className="text-xs text-muted">
                      {wf.createdAt ? timeAgo(wf.createdAt) : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    if (wf.status === 'paused') {
                      openConfirm(wf.id, wf.name, "resume");
                    } else {
                      openConfirm(wf.id, wf.name, "pause");
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-all ${
                    wf.status === 'paused' 
                      ? 'text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
                      : 'text-amber-400 hover:bg-amber-500/10 border-transparent hover:border-amber-500/20'
                  }`}
                >
                  {wf.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    openConfirm(wf.id, wf.name, "delete");
                  }}
                  className="px-3 py-1.5 rounded-md text-xs text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                >
                  Delete
                </button>
                <span className="ml-2 text-muted group-hover:text-foreground transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
