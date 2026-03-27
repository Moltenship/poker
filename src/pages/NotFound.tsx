import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
      <span className="text-4xl font-bold text-muted-foreground/20 mb-2">404</span>
      <h1 className="text-sm font-semibold mb-1">Page not found</h1>
      <p className="text-[13px] text-muted-foreground mb-4">
        This page doesn't exist.
      </p>
      <Link to="/">
        <Button variant="secondary" size="sm" className="h-7 text-[13px]">Home</Button>
      </Link>
    </div>
  );
}
