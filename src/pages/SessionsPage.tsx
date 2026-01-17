import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import SessionCard from "@/components/dashboard/SessionCard";
import SessionDetail from "@/components/dashboard/SessionDetail";

interface Session {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  status: string;
  summary?: string | null;
  topics_discussed?: string[] | null;
  main_goals?: string[] | null;
  session_type?: string;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (data) {
          setSessions(data);

          // Check for session ID in URL
          const sessionId = searchParams.get("id");
          if (sessionId) {
            const found = data.find((s) => s.id === sessionId);
            if (found) setSelectedSession(found);
          } else if (data.length > 0) {
            setSelectedSession(data[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Review your past coaching sessions and key insights.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Sessions List */}
        <div className="w-80 flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">
              {sessions.length} sessions
            </span>
          </div>

          <div className="flex-1 overflow-auto space-y-2 pr-2">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                {...session}
                isSelected={selectedSession?.id === session.id}
                onClick={() => setSelectedSession(session)}
              />
            ))}
          </div>

          <Button
            className="mt-4 w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => navigate("/conversation")}
          >
            Start New Session
          </Button>
        </div>

        {/* Session Detail */}
        <div className="flex-1 bg-card rounded-xl border border-border flex flex-col min-h-0">
          <SessionDetail session={selectedSession} />
        </div>
      </div>
    </div>
  );
}
