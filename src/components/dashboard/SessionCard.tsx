import { format } from "date-fns";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionCardProps {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  session_type?: string;
  topics_discussed?: string[] | null;
  isSelected?: boolean;
  onClick: () => void;
}

export default function SessionCard({
  started_at,
  duration_seconds,
  session_type,
  topics_discussed,
  isSelected,
  onClick,
}: SessionCardProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "disc":
        return "bg-yellow-500/20 text-yellow-400";
      case "coach":
      default:
        return "bg-primary/20 text-primary";
    }
  };

  const displayTopics = topics_discussed?.slice(0, 2) || [];
  const remainingCount = (topics_discussed?.length || 0) - 2;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-colors",
        isSelected
          ? "bg-sidebar-accent border-primary"
          : "bg-card border-border hover:bg-muted/30"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs px-2 py-1 rounded-full ${getTypeColor(session_type)}`}
        >
          {session_type || "coach"}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(duration_seconds)}
        </span>
      </div>

      <p className="text-sm font-medium text-foreground mb-2">
        {format(new Date(started_at), "MMMM d, yyyy")}
      </p>

      {displayTopics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {displayTopics.map((topic, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {topic}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
              +{remainingCount} more
            </span>
          )}
        </div>
      )}
    </button>
  );
}
