import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function statusColor(status: string): string {
  switch (status) {
    case 'completed':
    case 'success':
      return 'text-emerald-400';
    case 'running':
    case 'pending':
      return 'text-amber-400';
    case 'failed':
      return 'text-rose-400';
    default:
      return 'text-zinc-400';
  }
}

export function statusBg(status: string): string {
  switch (status) {
    case 'completed':
    case 'success':
      return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    case 'running':
    case 'pending':
      return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    case 'failed':
      return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
    default:
      return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400';
  }
}
