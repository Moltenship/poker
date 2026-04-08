import type { ReactNode } from "react";

import { Link, useLocation } from "@tanstack/react-router";

import { ConnectionDot } from "./ConnectionBanner";
import { ThemeToggle } from "./ThemeToggle";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/room/");

  if (isRoom) {
    return <>{children}</>;
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/40 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-11 max-w-2xl items-center px-4">
          <Link to="/" className="text-foreground text-[13px] font-semibold">
            Planning Poker
          </Link>
          <nav className="ml-6 flex items-center gap-0.5">
            <Link
              to="/"
              activeProps={{ className: "text-foreground font-medium" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="rounded-md px-2.5 py-1 text-[13px] transition-colors"
              activeOptions={{ exact: true }}
            >
              Home
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ConnectionDot />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
