import { MessageSquare, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface ActivitySummaryCardProps {
  totalConversations: number;
  avgDuration: string;
  lastSession: string | null;
}

export default function ActivitySummaryCard({
  totalConversations,
  avgDuration,
  lastSession,
}: ActivitySummaryCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-foreground">
          Your Activity Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{totalConversations}</p>
            <p className="text-sm text-muted-foreground">Total Conversations</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Average Duration:</span>
            <span className="text-foreground font-medium">{avgDuration}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Last Session:</span>
            <span className="text-foreground font-medium">
              {lastSession ? format(new Date(lastSession), "MMM d, yyyy") : "—"}
            </span>
          </div>
        </div>

        <Button
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={() => navigate("/conversation")}
        >
          Start New Session
        </Button>
      </CardContent>
    </Card>
  );
}
