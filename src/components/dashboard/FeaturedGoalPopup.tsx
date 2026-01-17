import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FeaturedGoalPopupProps {
  goal: string;
  onClose: () => void;
}

export default function FeaturedGoalPopup({ goal, onClose }: FeaturedGoalPopupProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-card border border-border rounded-xl shadow-lg p-4 animate-slide-up">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-foreground mb-1">
            Featured Goal
          </h4>
          <p className="text-sm text-muted-foreground mb-3">{goal}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs"
              onClick={() => navigate("/conversation")}
            >
              Discuss with Coach
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={onClose}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
