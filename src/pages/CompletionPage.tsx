import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Star, Clock, MessageSquare, Target, Loader2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, SessionData } from "@/hooks/useSession";
import { useAuth } from "@/hooks/useAuth";
import { useExportTranscript } from "@/hooks/useExportTranscript";
import { useToast } from "@/hooks/use-toast";
const feedbackOptions = [
  "This felt natural and easy",
  "This was too long",
  "I had technical issues",
  "I didn't feel comfortable sharing",
];

export default function CompletionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const { user } = useAuth();
  const { getSession, getUserSessions, generateSummary, getSessionMessages } = useSession();
  const { exportAsText, exportAsPDF } = useExportTranscript();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<{ id: string; content: string; sender: string; created_at: string }>>([]);
  const [exporting, setExporting] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Fetch session data and generate summary
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all user sessions for count
        const sessions = await getUserSessions();
        setTotalSessions(sessions.length);

        // Fetch specific session if ID provided
        if (sessionId) {
          const session = await getSession(sessionId);
          setSessionData(session);

          // Fetch messages for export
          const sessionMessages = await getSessionMessages(sessionId);
          setMessages(sessionMessages);

          // Generate summary if not already generated
          if (session && !session.summary) {
            setGeneratingSummary(true);
            await generateSummary(sessionId);
            // Refetch session to get updated data
            const updatedSession = await getSession(sessionId);
            setSessionData(updatedSession);
            setGeneratingSummary(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch session data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, sessionId, getSession, getUserSessions, generateSummary, getSessionMessages]);

  const handleExportPDF = async () => {
    if (!sessionData) return;
    setExporting(true);
    try {
      exportAsPDF(sessionData, messages);
      toast({
        title: "Export Complete",
        description: "Your transcript has been downloaded as PDF.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export transcript. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportText = async () => {
    if (!sessionData) return;
    setExporting(true);
    try {
      exportAsText(sessionData, messages);
      toast({
        title: "Export Complete",
        description: "Your transcript has been downloaded as text file.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export transcript. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFeedbackToggle = (option: string) => {
    setSelectedFeedback((prev) =>
      prev.includes(option)
        ? prev.filter((f) => f !== option)
        : [...prev, option]
    );
  };

  const handleClose = () => {
    navigate("/");
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-6 overflow-y-auto">
      {/* Success Icon */}
      <div className="relative mb-8 mt-8">
        <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center animate-fade-in">
          <div className="w-16 h-16 rounded-full gradient-hero flex items-center justify-center shadow-glow">
            <Check className="w-8 h-8 text-white" />
          </div>
        </div>
        {/* Celebration particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/40"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${10 + Math.random() * 80}%`,
                animation: `float ${2 + Math.random()}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 animate-fade-in">
        Conversation Complete!
      </h1>

      {/* Message */}
      <p className="text-muted-foreground text-center max-w-sm mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        Thank you for sharing openly and honestly. Your insights will help
        improve our workplace for everyone.
      </p>

      {/* Session Metrics */}
      {sessionData && (
        <div 
          className="w-full max-w-md bg-card rounded-2xl p-6 shadow-lg border border-border mb-6 animate-slide-up"
          style={{ animationDelay: "0.15s" }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Session Summary
          </h2>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-semibold text-foreground">{formatDuration(sessionData.duration_seconds)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
              <MessageSquare className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
                <p className="font-semibold text-foreground">{totalSessions}</p>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          {generatingSummary ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating summary...</span>
            </div>
          ) : sessionData.summary ? (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">What we discussed:</p>
              <p className="text-foreground">{sessionData.summary}</p>
            </div>
          ) : null}

          {/* Goals */}
          {sessionData.main_goals && sessionData.main_goals.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <p className="text-sm text-muted-foreground">Main Goals</p>
              </div>
              <ul className="space-y-1">
                {sessionData.main_goals.map((goal, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Topics */}
          {sessionData.topics_discussed && sessionData.topics_discussed.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Topics Covered</p>
              <div className="flex flex-wrap gap-2">
                {sessionData.topics_discussed.map((topic, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Export Buttons */}
          {messages.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Export Transcript</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="flex-1"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportText}
                  disabled={exporting}
                  className="flex-1"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Text
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Card */}
      <div 
        className="w-full max-w-md bg-card rounded-2xl p-6 shadow-lg border border-border animate-slide-up"
        style={{ animationDelay: "0.2s" }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick Feedback (Optional)
        </h2>

        {/* Star Rating */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">
            How was this experience?
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? "fill-accent text-accent"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Options */}
        <div className="flex flex-wrap gap-2 mb-6">
          {feedbackOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleFeedbackToggle(option)}
              className={`px-3 py-2 rounded-full text-sm transition-all ${
                selectedFeedback.includes(option)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Submit Feedback */}
        {(rating > 0 || selectedFeedback.length > 0) && (
          <Button
            className="w-full gradient-hero text-white"
            onClick={handleClose}
          >
            Submit Feedback
          </Button>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="mt-6 text-muted-foreground hover:text-foreground transition-colors"
      >
        Close
      </button>
    </div>
  );
}
