"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { statusBg, timeAgo, cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [yamlInput, setYamlInput] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

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

  async function handleDelete(id: string) {
    try {
      await api.deleteWorkflow(id);
      await loadWorkflows();
    } catch {}
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium text-sm hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50"
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
              className="glass glass-hover rounded-xl p-5 flex items-center justify-between group transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center text-accent font-mono text-sm font-bold">
                  {wf.name?.[0]?.toUpperCase() ?? "W"}
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-accent-bright transition-colors">
                    {wf.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted">v{wf.currentVersion}</span>
                    <span className="text-xs text-muted">
                      {wf.createdAt ? timeAgo(wf.createdAt) : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(wf.id);
                  }}
                  className="px-3 py-1.5 rounded-md text-xs text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all opacity-0 group-hover:opacity-100"
                >
                  Delete
                </button>
                <span className="text-muted group-hover:text-foreground transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
