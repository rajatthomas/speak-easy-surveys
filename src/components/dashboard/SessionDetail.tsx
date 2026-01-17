import { Download, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface SessionDetailProps {
  session: {
    id: string;
    started_at: string;
    duration_seconds: number | null;
    session_type?: string;
    summary?: string | null;
    topics_discussed?: string[] | null;
    main_goals?: string[] | null;
  } | null;
}

export default function SessionDetail({ session }: SessionDetailProps) {
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

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Select a Session</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Choose a session from the list to view its details, summary, and key insights.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(session.session_type)}`}>
              {session.session_type || "coach"}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatDuration(session.duration_seconds)}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {format(new Date(session.started_at), "MMMM d, yyyy")}
          </h2>
        </div>
      </div>

      {/* Summary */}
      {session.summary && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Summary</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {session.summary}
          </p>
        </div>
      )}

      {/* Topics */}
      {session.topics_discussed && session.topics_discussed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Topics Covered</h3>
          <div className="flex flex-wrap gap-2">
            {session.topics_discussed.map((topic, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights / Goals */}
      {session.main_goals && session.main_goals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Key Insights</h3>
          <ul className="space-y-2">
            {session.main_goals.map((goal, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-accent mt-1">•</span>
                <span className="text-muted-foreground">{goal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Download Button */}
      <Button
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        <Download className="w-4 h-4 mr-2" />
        Download Session Notes
      </Button>
    </div>
  );
}
