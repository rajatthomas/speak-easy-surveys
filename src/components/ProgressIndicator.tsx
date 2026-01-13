import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  currentSession: number;
  totalSessions: number;
  progress: number; // 0-100
  className?: string;
}

export function ProgressIndicator({
  currentSession,
  totalSessions,
  progress,
  className,
}: ProgressIndicatorProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>Session {currentSession} of {totalSessions}</span>
        <span>{Math.round(progress)}% complete</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full gradient-hero rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
