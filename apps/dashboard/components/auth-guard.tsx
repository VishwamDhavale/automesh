"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("automesh_token");

    if (!token && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  if (!checked && !PUBLIC_PATHS.includes(pathname)) {
    // Show nothing while checking auth
    return null;
  }

  return <>{children}</>;
}
