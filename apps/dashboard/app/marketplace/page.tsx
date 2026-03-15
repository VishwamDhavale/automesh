"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function MarketplacePage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"integrations" | "plugins">("integrations");

  useEffect(() => {
    async function load() {
      try {
        const [i, p] = await Promise.allSettled([
          api.getIntegrations(),
          api.getPlugins(),
        ]);
        if (i.status === "fulfilled") setIntegrations(i.value);
        if (p.status === "fulfilled") setPlugins(p.value);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const categoryIcons: Record<string, string> = {
    payments: "💳",
    messaging: "💬",
    crm: "👥",
    storage: "📦",
    "dev-tools": "🛠️",
  };

  const categoryColors: Record<string, string> = {
    payments: "from-violet-500/20 to-indigo-500/20",
    messaging: "from-emerald-500/20 to-green-500/20",
    crm: "from-blue-500/20 to-cyan-500/20",
    storage: "from-orange-500/20 to-amber-500/20",
    "dev-tools": "from-zinc-500/20 to-slate-500/20",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-muted mt-1">Browse integrations and action plugins</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("integrations")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "integrations" ? "bg-accent text-white" : "text-muted hover:text-foreground"
          }`}
        >
          Integrations
        </button>
        <button
          onClick={() => setTab("plugins")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "plugins" ? "bg-accent text-white" : "text-muted hover:text-foreground"
          }`}
        >
          Action Plugins
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-xl animate-shimmer" />)}
        </div>
      ) : tab === "integrations" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="glass glass-hover rounded-xl p-6 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryColors[integration.category] ?? categoryColors.payments} flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform`}>
                  {categoryIcons[integration.category] ?? "🔌"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold group-hover:text-accent-bright transition-colors">
                    {integration.displayName}
                  </h3>
                  <span className="text-xs text-muted capitalize">{integration.category}</span>
                </div>
              </div>
              <p className="text-sm text-muted mt-3">{integration.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {integration.webhookEvents?.slice(0, 3).map((evt: string) => (
                  <span key={evt} className="px-2 py-0.5 rounded text-[10px] font-mono bg-background border border-border text-muted">
                    {evt}
                  </span>
                ))}
                {integration.actions?.slice(0, 2).map((action: string) => (
                  <span key={action} className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/10 border border-accent/20 text-accent">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plugins.map((plugin) => (
            <div
              key={plugin.name}
              className="glass glass-hover rounded-xl p-6 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-accent shrink-0 group-hover:scale-110 transition-transform">
                  {plugin.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold font-mono text-sm group-hover:text-accent-bright transition-colors">
                    {plugin.name}
                  </h3>
                  <span className="text-xs text-muted">v{plugin.version}</span>
                </div>
              </div>
              <p className="text-sm text-muted mt-3">{plugin.description}</p>
              <div className="mt-4 space-y-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted font-medium">Inputs</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {plugin.inputs?.map((input: string) => (
                      <span key={input} className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        {input}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted font-medium">Outputs</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {plugin.outputs?.map((output: string) => (
                      <span key={output} className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        {output}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
