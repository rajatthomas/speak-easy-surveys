import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface DISCFactorsCardProps {
  dominance: number;
  influence: number;
  steadiness: number;
  compliance: number;
  updatedAt?: string;
}

export default function DISCFactorsCard({
  dominance,
  influence,
  steadiness,
  compliance,
  updatedAt,
}: DISCFactorsCardProps) {
  const factors = [
    { name: "Dominance", value: dominance, color: "bg-red-500" },
    { name: "Influence", value: influence, color: "bg-yellow-500" },
    { name: "Steadiness", value: steadiness, color: "bg-green-500" },
    { name: "Compliance", value: compliance, color: "bg-blue-500" },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-foreground">
          Your DISC Factors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.map((factor) => (
          <div key={factor.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{factor.name}</span>
              <span className="text-muted-foreground">{factor.value}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${factor.color} rounded-full transition-all duration-500`}
                style={{ width: `${factor.value}%` }}
              />
            </div>
          </div>
        ))}

        {updatedAt && (
          <p className="text-xs text-muted-foreground pt-2">
            Last updated: {format(new Date(updatedAt), "MMM d, yyyy")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
