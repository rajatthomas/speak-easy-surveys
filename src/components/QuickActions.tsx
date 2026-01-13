import { cn } from "@/lib/utils";
import { Pause, AlertCircle } from "lucide-react";

interface QuickActionsProps {
  onPause: () => void;
  onIssue: () => void;
  className?: string;
}

export function QuickActions({ onPause, onIssue, className }: QuickActionsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <button
        onClick={onPause}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium transition-colors hover:bg-secondary/80"
      >
        <Pause className="w-4 h-4" />
        I need a break
      </button>
      <button
        onClick={onIssue}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium transition-colors hover:bg-muted/80"
      >
        <AlertCircle className="w-4 h-4" />
        Something's wrong
      </button>
    </div>
  );
}
