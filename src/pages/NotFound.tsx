import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <span className="text-muted-foreground/20 mb-2 text-4xl font-bold">404</span>
      <h1 className="mb-1 text-sm font-semibold">Page not found</h1>
      <p className="text-muted-foreground mb-4 text-[13px]">This page doesn't exist.</p>
      <Link to="/">
        <Button variant="secondary" size="sm" className="h-7 text-[13px]">
          Home
        </Button>
      </Link>
    </div>
  );
}
