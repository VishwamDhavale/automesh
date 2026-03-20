"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const body: Record<string, string> = { email, password };
    if (isRegister && name) body.name = name;

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Something went wrong");
      }

      const data = await res.json();
      localStorage.setItem("automesh_token", data.token);
      localStorage.setItem("automesh_user", JSON.stringify(data.user));
      router.push("/");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-lg font-bold">A</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Automesh
            </span>
          </div>
          <p className="text-muted text-sm">
            {isRegister
              ? "Create your account to get started"
              : "Sign in to your workflow engine"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {isRegister && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
            {isRegister && (
              <p className="text-xs text-muted">Must be at least 6 characters</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading
              ? isRegister
                ? "Creating account…"
                : "Signing in…"
              : isRegister
                ? "Create Account"
                : "Sign In"}
          </button>

          <p className="text-center text-sm text-muted mt-4">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-accent-bright hover:underline cursor-pointer"
            >
              {isRegister ? "Sign in" : "Create one"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
