import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSession, SessionData } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  Star,
  Clock,
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import oyosLogo from "@/assets/oyos-logo.png";
import oyosLogoDark from "@/assets/oyos-logo-dark.png";
import { format, formatDistanceToNow } from "date-fns";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";

interface ExtendedSessionData extends SessionData {
  rating?: number | null;
  feedback?: string[] | null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { getUserSessions } = useSession();
  const [sessions, setSessions] = useState<ExtendedSessionData[]>([]);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch profile for member since date
        const { data: profile } = await supabase
          .from("profiles")
          .select("created_at")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setMemberSince(profile.created_at);
        }

        // Fetch all sessions with extended fields
        const { data: sessionsData } = await supabase
          .from("sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (sessionsData) {
          setSessions(sessionsData as ExtendedSessionData[]);
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
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === "completed").length;
    const sessionsWithRating = sessions.filter(s => s.rating != null);
    const avgRating = sessionsWithRating.length > 0
      ? sessionsWithRating.reduce((sum, s) => sum + (s.rating || 0), 0) / sessionsWithRating.length
      : null;
    const avgDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length
      : 0;

    // Aggregate all topics
    const topicCounts: Record<string, number> = {};
    sessions.forEach(session => {
      session.topics_discussed?.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    const topThemes = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      totalSessions,
      completedSessions,
      avgRating,
      avgDuration,
      topThemes,
    };
  }, [sessions]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatMemberSince = (date: string | null) => {
    if (!date) return "—";
    return format(new Date(date), "MMMM yyyy");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src={theme === "dark" ? oyosLogoDark : oyosLogo} alt="OYOS" className="h-8 w-auto dark:logo-glow transition-all duration-300" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <ThemeToggle />
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Member Since</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {formatMemberSince(memberSince)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs">Total Sessions</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {metrics.totalSessions}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Star className="w-4 h-4" />
              <span className="text-xs">Avg Rating</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {metrics.avgRating ? metrics.avgRating.toFixed(1) : "—"}
              {metrics.avgRating && <span className="text-sm text-muted-foreground"> / 5</span>}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Avg Duration</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {formatDuration(metrics.avgDuration)}
            </p>
          </div>
        </div>

        {/* Main Themes */}
        {metrics.topThemes.length > 0 && (
          <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Main Themes Discussed</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {metrics.topThemes.map(([topic, count]) => (
                <span
                  key={topic}
                  className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full flex items-center gap-2"
                >
                  {topic}
                  <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Session History */}
        <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Session History</h2>
          </div>

          {sessions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No sessions yet. Start a conversation to see your history here.</p>
              <Button 
                className="mt-4 gradient-accent text-white"
                onClick={() => navigate("/conversation")}
              >
                Start Conversation
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <React.Fragment key={session.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedSession(
                          expandedSession === session.id ? null : session.id
                        )}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {format(new Date(session.started_at), "MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{formatDuration(session.duration_seconds)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            session.status === "completed" 
                              ? "bg-success/10 text-success"
                              : session.status === "paused"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {session.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {session.rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-accent text-accent" />
                              <span>{session.rating}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {expandedSession === session.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedSession === session.id && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30">
                            <div className="p-4 space-y-3">
                              {session.summary && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Summary</p>
                                  <p className="text-sm">{session.summary}</p>
                                </div>
                              )}
                              {session.main_goals && session.main_goals.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Goals</p>
                                  <ul className="text-sm space-y-1">
                                    {session.main_goals.map((goal, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-primary">•</span>
                                        {goal}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {session.topics_discussed && session.topics_discussed.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Topics</p>
                                  <div className="flex flex-wrap gap-1">
                                    {session.topics_discussed.map((topic, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                                      >
                                        {topic}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!session.summary && !session.main_goals?.length && !session.topics_discussed?.length && (
                                <p className="text-sm text-muted-foreground">No details available for this session.</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
