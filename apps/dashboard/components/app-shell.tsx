"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";

const PUBLIC_PATHS = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    const token = localStorage.getItem("automesh_token");
    if (!token && !isPublic) {
      router.replace("/login");
    } else {
      setAuthed(!!token);
    }
  }, [pathname, isPublic, router]);

  // Public pages (login) — render without sidebar
  if (isPublic) {
    return <>{children}</>;
  }

  // Loading state while checking auth
  if (authed === null) {
    return null;
  }

  // Authenticated — render with sidebar
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
