import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Automesh",
  description: "Sign in to your Automesh workflow engine",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
