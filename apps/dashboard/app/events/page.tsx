"use client";

import { useState, useEffect } from "react";
import { timeAgo } from "@/lib/utils";
import { api } from "@/lib/api";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getEvents();
        setEvents(data);
      } catch {}
      setLoading(false);
    }
    load();

    // Poll for new events every 5s
    const interval = setInterval(async () => {
      try {
        const data = await api.getEvents();
        setEvents(data);
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const sourceColors: Record<string, string> = {
    stripe: "bg-violet-500/10 border-violet-500/20 text-violet-400",
    github: "bg-zinc-500/10 border-zinc-500/20 text-zinc-300",
    slack: "bg-green-500/10 border-green-500/20 text-green-400",
    resend: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    manual: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted mt-1">Real-time event activity feed</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
          Live
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-xl animate-shimmer" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <div className="text-5xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold mb-2">No events yet</h3>
          <p className="text-muted text-sm">Events will appear here when webhooks are received</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="glass glass-hover rounded-xl p-4 flex items-center justify-between transition-all duration-200"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 ${sourceColors[event.source] ?? sourceColors.manual}`}>
                  {event.source}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium truncate">{event.eventType}</p>
                  <p className="text-xs text-muted font-mono mt-0.5 truncate">{event.id}</p>
                </div>
              </div>
              <span className="text-xs text-muted shrink-0 ml-4">
                {event.createdAt ? timeAgo(event.createdAt) : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
