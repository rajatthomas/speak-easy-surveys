import { useNavigate } from "react-router-dom";
import { AIAvatar } from "@/components/AIAvatar";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { Play, RotateCcw } from "lucide-react";

export default function PausedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Welcome Back */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Welcome back!
        </h1>
        <p className="text-muted-foreground">
          Ready to continue where we left off?
        </p>
      </div>

      {/* AI Avatar */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <AIAvatar state="idle" size="lg" />
      </div>

      {/* Progress Card */}
      <div 
        className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-lg border border-border mb-8 animate-slide-up"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="text-sm font-medium text-foreground mb-2">
          Session 2 of 3
        </div>
        
        <ProgressIndicator
          currentSession={2}
          totalSessions={3}
          progress={67}
          className="mb-4"
        />

        <p className="text-sm text-muted-foreground">
          Last time we talked about how the onboarding process went.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <Button
          size="lg"
          onClick={() => navigate("/conversation")}
          className="gradient-accent text-white border-0 shadow-accent-glow hover:scale-105 transition-all duration-300"
        >
          <Play className="w-5 h-5 mr-2" />
          Continue Conversation
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate("/conversation")}
          className="border-border"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Start Over Instead
        </Button>
      </div>
    </div>
  );
}
