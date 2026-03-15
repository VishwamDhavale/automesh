"use client";

import { useState, useCallback } from "react";

interface BuilderNode {
  id: string;
  type: "trigger" | "action" | "condition";
  label: string;
  data: Record<string, string>;
  x: number;
  y: number;
}

interface BuilderEdge {
  from: string;
  to: string;
}

const AVAILABLE_TRIGGERS = [
  { label: "Webhook Event", value: "event", icon: "⚡" },
  { label: "Scheduled (Cron)", value: "schedule", icon: "🕐" },
  { label: "Manual Trigger", value: "manual", icon: "👆" },
];

const AVAILABLE_ACTIONS = [
  { label: "Send Email", value: "send_email", icon: "📧" },
  { label: "Create Contact", value: "create_contact", icon: "👤" },
  { label: "Notify Slack", value: "notify_slack", icon: "💬" },
];

export default function BuilderPage() {
  const [nodes, setNodes] = useState<BuilderNode[]>([]);
  const [edges, setEdges] = useState<BuilderEdge[]>([]);
  const [workflowName, setWorkflowName] = useState("my_workflow");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const addNode = useCallback((type: BuilderNode["type"], label: string, value: string) => {
    const id = `${type}_${Date.now()}`;
    const y = nodes.length * 120 + 40;

    const newNode: BuilderNode = {
      id,
      type,
      label,
      data: type === "trigger" ? { event: value } : { action: value },
      x: 200,
      y,
    };

    setNodes(prev => {
      const updated = [...prev, newNode];
      // Auto-connect to the last node
      if (prev.length > 0) {
        setEdges(e => [...e, { from: prev[prev.length - 1].id, to: id }]);
      }
      return updated;
    });
  }, [nodes]);

  const removeNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
    if (selectedNode === id) setSelectedNode(null);
  }, [selectedNode]);

  const exportYaml = useCallback(() => {
    const triggerNode = nodes.find(n => n.type === "trigger");
    const actionNodes = nodes.filter(n => n.type === "action");

    let yaml = `workflow: ${workflowName}\n\n`;

    if (triggerNode) {
      yaml += `trigger:\n`;
      if (triggerNode.data.event === "manual") {
        yaml += `  manual: true\n`;
      } else if (triggerNode.data.event === "schedule") {
        yaml += `  schedule: "${triggerNode.data.schedule ?? "0 9 * * 1"}"\n`;
      } else {
        yaml += `  event: ${triggerNode.data.event || "stripe.payment_succeeded"}\n`;
      }
    }

    if (actionNodes.length > 0) {
      yaml += `\nsteps:\n`;
      actionNodes.forEach((node, i) => {
        yaml += `  - action: ${node.data.action}\n`;
        yaml += `    id: step${i + 1}\n`;
      });
    }

    return yaml;
  }, [nodes, workflowName]);

  const [showExport, setShowExport] = useState(false);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragging(nodeId);
    setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setNodes(prev =>
      prev.map(n =>
        n.id === dragging
          ? { ...n, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
          : n
      )
    );
  };

  const handleMouseUp = () => setDragging(null);

  const typeColors = {
    trigger: "from-blue-500/30 to-cyan-500/30 border-blue-500/30",
    action: "from-violet-500/30 to-purple-500/30 border-violet-500/30",
    condition: "from-amber-500/30 to-yellow-500/30 border-amber-500/30",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visual Builder</h1>
          <p className="text-muted mt-1">Drag and drop to build workflows</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExport(!showExport)}
            className="px-4 py-2.5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-bright transition-all"
          >
            {showExport ? "Hide YAML" : "Export YAML"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Toolbar */}
        <div className="space-y-4">
          {/* Workflow Name */}
          <div className="glass rounded-xl p-4">
            <label className="text-xs font-medium text-muted mb-2 block">Workflow Name</label>
            <input
              type="text"
              value={workflowName}
              onChange={(e: any) => setWorkflowName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-accent focus:outline-none transition-all"
            />
          </div>

          {/* Triggers */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Triggers</h3>
            <div className="space-y-2">
              {AVAILABLE_TRIGGERS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => addNode("trigger", t.label, t.value)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm hover:bg-blue-500/10 transition-all text-left"
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              {AVAILABLE_ACTIONS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => addNode("action", a.label, a.value)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-violet-500/5 border border-violet-500/20 text-sm hover:bg-violet-500/10 transition-all text-left"
                >
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-3">
          <div
            className="glass rounded-xl relative overflow-hidden"
            style={{ height: "600px" }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid background */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }} />

            {nodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted">
                <div className="text-center">
                  <p className="text-lg mb-2">🧩</p>
                  <p className="text-sm">Click triggers and actions to add them to the canvas</p>
                </div>
              </div>
            ) : (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                {edges.filter((edge, index, self) => 
                  index === self.findIndex((e) => e.from === edge.from && e.to === edge.to)
                ).map((edge) => {
                  const from = nodes.find(n => n.id === edge.from);
                  const to = nodes.find(n => n.id === edge.to);
                  if (!from || !to) return null;

                  return (
                    <line
                      key={`${edge.from}-${edge.to}`}
                      x1={from.x + 120}
                      y1={from.y + 35}
                      x2={to.x + 120}
                      y2={to.y + 5}
                      stroke="oklch(0.65 0.25 270 / 0.4)"
                      strokeWidth="2"
                      strokeDasharray="6 3"
                    />
                  );
                })}
              </svg>
            )}

            {nodes.map((node) => (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onClick={() => setSelectedNode(node.id)}
                className={`absolute cursor-move select-none transition-shadow duration-200 ${
                  selectedNode === node.id ? "ring-2 ring-accent/50" : ""
                }`}
                style={{ left: node.x, top: node.y, zIndex: 1 }}
              >
                <div className={`w-60 rounded-xl bg-gradient-to-br ${typeColors[node.type]} backdrop-blur-sm border p-4 group`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted">
                        {node.type}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                      className="text-xs text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="font-medium text-sm mt-1">{node.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Export YAML Panel */}
          {showExport && (
            <div className="glass rounded-xl p-5 mt-4">
              <h3 className="text-sm font-semibold mb-3">Generated YAML</h3>
              <pre className="text-sm font-mono bg-background rounded-lg p-4 border border-border overflow-x-auto whitespace-pre-wrap">
                {exportYaml()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
