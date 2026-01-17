import { Target, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface Goal {
  id: string;
  title: string;
  type: string;
}

interface GoalsPreviewCardProps {
  goals: Goal[];
  activeCount: number;
}

export default function GoalsPreviewCard({ goals, activeCount }: GoalsPreviewCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Your Goals
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {activeCount} active goals
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.length > 0 ? (
          <>
            <ul className="space-y-2">
              {goals.slice(0, 3).map((goal) => (
                <li key={goal.id} className="flex items-start gap-2 text-sm">
                  <span className="text-accent mt-1">•</span>
                  <div>
                    <span className="text-foreground">{goal.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {goal.type}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate("/dashboard/goals")}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View All Goals
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No goals set yet. Start a coaching session to define your goals.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
