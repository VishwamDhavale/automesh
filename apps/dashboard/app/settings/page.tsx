"use client";

import { useState, useEffect } from "react";
import type { IntegrationDefinition } from "@automesh/shared-types";

interface DBIntegration {
  id: string;
  provider: string;
  config: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [available, setAvailable] = useState<IntegrationDefinition[]>([]);
  const [configured, setConfigured] = useState<DBIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProvider, setSelectedProvider] = useState<IntegrationDefinition | null>(null);
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [availRes, confRes] = await Promise.all([
        fetch("http://localhost:4000/api/integrations/available"),
        fetch("http://localhost:4000/api/integrations"),
      ]);

      if (availRes.ok) setAvailable(await availRes.json());
      if (confRes.ok) setConfigured(await confRes.json());
    } catch (err) {
      console.error("Failed to fetch integrations", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (provider: IntegrationDefinition) => {
    setSelectedProvider(provider);
    const existing = configured.find((c) => c.provider === provider.id);
    const initialConfig: Record<string, string> = {};
    provider.fields.forEach((f) => {
      initialConfig[f.key] = existing?.config?.[f.key] || "";
    });
    setFormConfig(initialConfig);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setIsSaving(true);
    try {
      const res = await fetch("http://localhost:4000/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider.id,
          config: formConfig,
        }),
      });

      if (res.ok) {
        await fetchData();
        setSelectedProvider(null);
      } else {
        alert("Failed to save integration");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving integration");
    } finally {
      setIsSaving(false);
    }
  };

  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);

  const handleDisconnect = async (providerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to disconnect this integration? This will delete your stored API keys.")) return;
    
    setIsDisconnecting(providerId);
    try {
      const res = await fetch(`http://localhost:4000/api/integrations/${providerId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchData();
        if (selectedProvider?.id === providerId) {
          setSelectedProvider(null);
        }
      } else {
        alert("Failed to disconnect integration");
      }
    } catch (err) {
      console.error(err);
      alert("Error disconnecting integration");
    } finally {
      setIsDisconnecting(null);
    }
  };

  // Helper to render markdown links safely in the guide
  const renderGuideStep = (text: string) => {
    const parts = text.split(/(\[.*?\]\(.*?\))/);
    return parts.map((part, i) => {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return (
          <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            {match[1]}
          </a>
        );
      }
      
      // Handle bold Markdown (**text**)
      const boldParts = part.split(/(\*\*.*?\*\*)/);
      return (
        <span key={i}>
          {boldParts.map((bPart, j) => {
            const bMatch = bPart.match(/\*\*(.*?)\*\*/);
            if (bMatch) {
              return <strong key={j} className="text-foreground">{bMatch[1]}</strong>;
            }
            
            // Handle inline code (`code`)
            const codeParts = bPart.split(/(`.*?`)/);
            return (
              <span key={j}>
                {codeParts.map((cPart, k) => {
                  const cMatch = cPart.match(/`(.*?)`/);
                  if (cMatch) {
                    return <code key={k} className="px-1 py-0.5 bg-background rounded-md text-xs font-mono text-accent-bright">{cMatch[1]}</code>;
                  }
                  
                  // Handle italics Markdown (*text*)
                  const italicParts = cPart.split(/(\*.*?\*)/);
                  return (
                    <span key={k}>
                      {italicParts.map((iPart, l) => {
                        const iMatch = iPart.match(/\*(.*?)\*/);
                        if (iMatch) {
                          return <em key={l} className="italic text-muted">{iMatch[1]}</em>;
                        }
                        return <span key={l}>{iPart}</span>;
                      })}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </span>
      );
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted mt-1">
          Connect your favorite apps and securely store your API keys in the database.
        </p>
      </header>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface rounded-xl"></div>
          <div className="h-32 bg-surface rounded-xl"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {available.map((provider) => {
            const isConfigured = configured.some((c) => c.provider === provider.id);
            return (
              <div
                key={provider.id}
                className="bg-surface rounded-xl p-5 border border-border flex flex-col justify-between transition-all hover:border-border-hover group"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {provider.icon ? (
                      <div dangerouslySetInnerHTML={{ __html: provider.icon }} />
                    ) : (
                      <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent font-bold group-hover:bg-accent/20 transition-colors">
                        {provider.name[0]}
                      </div>
                    )}
                    <h3 className="font-semibold text-lg">{provider.name}</h3>
                  </div>
                  <p className="text-sm text-muted">{provider.description}</p>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      isConfigured ? "bg-emerald-500/10 text-emerald-400" : "bg-neutral-500/10 text-neutral-400"
                    }`}
                  >
                    {isConfigured ? "Connected" : "Not connected"}
                  </span>
                  <div className="flex items-center gap-4">
                    {isConfigured && (
                      <button
                        onClick={(e) => handleDisconnect(provider.id, e)}
                        disabled={isDisconnecting === provider.id}
                        className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {isDisconnecting === provider.id ? "Disconnecting..." : "Disconnect"}
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenModal(provider)}
                      className="text-sm font-medium text-accent hover:text-accent-bright transition-colors"
                    >
                      {isConfigured ? "Configure" : "Connect"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center text-accent font-bold">
                  {selectedProvider.name[0]}
                </div>
                <h3 className="font-bold text-lg">Configure {selectedProvider.name}</h3>
              </div>
              <button
                onClick={() => setSelectedProvider(null)}
                className="text-muted hover:text-foreground transition-colors p-2 rounded-lg hover:bg-surface-hover"
              >
                ✕
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Left Pane: Guide */}
              <div className="w-full md:w-1/2 p-6 md:p-8 border-r border-border bg-background/30 overflow-y-auto">
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How to Connect
                </h4>
                
                {selectedProvider.guide ? (
                  <div className="space-y-6">
                    <ol className="space-y-4">
                      {selectedProvider.guide.stepByStep.map((step, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-muted">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-semibold text-foreground">
                            {idx + 1}
                          </span>
                          <span className="pt-0.5 leading-relaxed">
                            {renderGuideStep(step)}
                          </span>
                        </li>
                      ))}
                    </ol>
                    
                    {selectedProvider.guide.docsUrl && (
                      <div className="mt-8 pt-6 border-t border-border">
                        <a 
                          href={selectedProvider.guide.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-accent hover:text-accent-bright transition-colors w-fit"
                        >
                          Read official {selectedProvider.name} docs
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60 mt-10">
                    <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Simply enter your keys to get started.</p>
                  </div>
                )}
              </div>

              {/* Right Pane: Form */}
              <div className="w-full md:w-1/2 p-6 md:p-8 bg-surface overflow-y-auto">
                <form id="integration-form" onSubmit={handleSave} className="space-y-6">
                  {selectedProvider.fields.map((field) => (
                    <div key={field.key} className="space-y-2 group">
                      <div className="flex justify-between items-baseline">
                        <label className="block text-sm font-semibold text-foreground">
                          {field.label}
                        </label>
                        {field.required && <span className="text-[10px] uppercase font-bold text-accent/80 tracking-wider">Required</span>}
                      </div>
                      
                      {field.description && (
                        <p className="text-xs text-muted leading-relaxed">{field.description}</p>
                      )}
                      
                      <input
                        type={field.type === "password" ? "password" : "text"}
                        value={formConfig[field.key] || ""}
                        onChange={(e) =>
                          setFormConfig({ ...formConfig, [field.key]: e.target.value })
                        }
                        placeholder={field.placeholder || (field.required ? "Required" : "Optional")}
                        className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all duration-200"
                        required={field.required}
                      />
                    </div>
                  ))}
                </form>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-5 border-t border-border bg-surface/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                form="integration-form"
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-bright glow-accent text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:glow-none"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
