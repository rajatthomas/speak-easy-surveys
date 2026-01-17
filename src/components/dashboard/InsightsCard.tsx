import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InsightsCardProps {
  insights: string[];
}

export default function InsightsCard({ insights }: InsightsCardProps) {
  const defaultInsights = [
    "You tend to be more productive in morning sessions",
    "Your communication style shows high emotional intelligence",
    "Focus areas include work-life balance and career growth",
    "You respond well to structured goal-setting approaches",
  ];

  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          Your Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {displayInsights.map((insight, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="text-accent mt-1">•</span>
              <span className="text-muted-foreground">{insight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
