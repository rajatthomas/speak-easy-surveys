import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import ActivitySummaryCard from "@/components/dashboard/ActivitySummaryCard";
import InsightsCard from "@/components/dashboard/InsightsCard";
import GoalsPreviewCard from "@/components/dashboard/GoalsPreviewCard";
import RecentSessionsTable from "@/components/dashboard/RecentSessionsTable";
import FeaturedGoalPopup from "@/components/dashboard/FeaturedGoalPopup";

interface Session {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  status: string;
  summary?: string | null;
  topics_discussed?: string[] | null;
}

interface Goal {
  id: string;
  title: string;
  type: string;
  status: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeaturedGoal, setShowFeaturedGoal] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch sessions
        const { data: sessionsData } = await supabase
          .from("sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (sessionsData) {
          setSessions(sessionsData);
        }

        // Fetch goals
        const { data: goalsData } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (goalsData) {
          setGoals(goalsData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalConversations = sessions.length;
    const avgDurationSecs = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length
      : 0;
    const avgDuration = avgDurationSecs > 0
      ? `${Math.floor(avgDurationSecs / 60)} min`
      : "—";
    const lastSession = sessions[0]?.started_at || null;

    // Extract insights from summaries
    const insights: string[] = [];
    sessions.slice(0, 5).forEach((session) => {
      if (session.summary) {
        const sentences = session.summary.split(". ");
        if (sentences[0]) insights.push(sentences[0]);
      }
    });

    return {
      totalConversations,
      avgDuration,
      lastSession,
      insights: insights.slice(0, 4),
    };
  }, [sessions]);

  const activeGoals = goals.filter((g) => g.status === "pending");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here's an overview of your coaching journey.
        </p>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActivitySummaryCard
          totalConversations={metrics.totalConversations}
          avgDuration={metrics.avgDuration}
          lastSession={metrics.lastSession}
        />
        <InsightsCard insights={metrics.insights} />
        <GoalsPreviewCard goals={activeGoals} activeCount={activeGoals.length} />
      </div>

      {/* Recent Sessions */}
      <RecentSessionsTable sessions={sessions} />

      {/* Featured Goal Popup */}
      {showFeaturedGoal && activeGoals.length > 0 && (
        <FeaturedGoalPopup
          goal={activeGoals[0].title}
          onClose={() => setShowFeaturedGoal(false)}
        />
      )}
    </div>
  );
}
