import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

const icons = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

const labels = {
  system: "Theme: system",
  light: "Theme: light",
  dark: "Theme: dark",
} as const;

export function ThemeToggle() {
  const { preference, cycleTheme } = useTheme();
  const Icon = icons[preference];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label={labels[preference]}
      className="size-7"
    >
      <Icon className="size-3.5" />
    </Button>
  );
}
