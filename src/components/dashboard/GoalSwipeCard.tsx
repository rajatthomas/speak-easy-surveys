import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface GoalSwipeCardProps {
  goal: {
    id: string;
    title: string;
    type: string;
  };
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export default function GoalSwipeCard({ goal, onSwipeLeft, onSwipeRight }: GoalSwipeCardProps) {
  const navigate = useNavigate();

  return (
    <div className="relative max-w-md mx-auto">
      {/* Card */}
      <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
        {/* Sparkle decoration */}
        <div className="absolute top-4 right-4">
          <Sparkles className="w-6 h-6 text-accent/30" />
        </div>

        {/* Type badge */}
        <span className="inline-block text-xs px-3 py-1 rounded-full bg-accent/20 text-accent mb-4">
          {goal.type === "short-term" ? "Short-term Goal" : "Long-term Goal"}
        </span>

        {/* Goal text */}
        <p className="text-lg font-medium text-foreground mb-6 leading-relaxed">
          {goal.title}
        </p>

        {/* Swipe instructions */}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-6">
          <span className="flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            Swipe to skip
          </span>
          <span className="flex items-center gap-1">
            Swipe to discuss
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>

        {/* Action button */}
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={() => navigate("/conversation")}
        >
          Discuss Now
        </Button>
      </div>

      {/* Swipe buttons (for desktop) */}
      <div className="flex justify-center gap-4 mt-4">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={onSwipeLeft}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={onSwipeRight}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
