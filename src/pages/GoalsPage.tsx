import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import GoalSwipeCard from "@/components/dashboard/GoalSwipeCard";

interface Goal {
  id: string;
  title: string;
  type: string;
  status: string;
}

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ skipped: 0, remaining: 0, discussed: 0 });

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (data) {
          setGoals(data);
          const skipped = data.filter((g) => g.status === "skipped").length;
          const discussed = data.filter((g) => g.status === "discussed").length;
          const remaining = data.filter((g) => g.status === "pending").length;
          setStats({ skipped, remaining, discussed });
        }
      } catch (error) {
        console.error("Failed to fetch goals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [user]);

  const pendingGoals = goals.filter((g) => g.status === "pending");
  const currentGoal = pendingGoals[currentIndex];

  const handleSwipeLeft = async () => {
    if (!currentGoal) return;

    await supabase
      .from("goals")
      .update({ status: "skipped" })
      .eq("id", currentGoal.id);

    setStats((prev) => ({
      ...prev,
      skipped: prev.skipped + 1,
      remaining: prev.remaining - 1,
    }));

    if (currentIndex < pendingGoals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setGoals(goals.filter((g) => g.id !== currentGoal.id));
      setCurrentIndex(0);
    }
  };

  const handleSwipeRight = async () => {
    if (!currentGoal) return;

    await supabase
      .from("goals")
      .update({ status: "discussed", discussed_at: new Date().toISOString() })
      .eq("id", currentGoal.id);

    setStats((prev) => ({
      ...prev,
      discussed: prev.discussed + 1,
      remaining: prev.remaining - 1,
    }));

    if (currentIndex < pendingGoals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setGoals(goals.filter((g) => g.id !== currentGoal.id));
      setCurrentIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Your Goals</h1>
        <p className="text-sm text-muted-foreground">
          Review and discuss your goals with your AI coach.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {currentGoal ? (
          <GoalSwipeCard
            goal={currentGoal}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
        ) : (
          <div className="text-center">
            <p className="text-lg text-foreground mb-2">No pending goals</p>
            <p className="text-sm text-muted-foreground">
              Start a coaching session to set new goals.
            </p>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="mt-8 text-center">
        <div className="flex justify-center gap-8 text-sm mb-2">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{stats.skipped}</span> skipped
          </span>
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{stats.remaining}</span> remaining
          </span>
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{stats.discussed}</span> discussed
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Swipe left to skip, swipe right to discuss with your coach
        </p>
      </div>
    </div>
  );
}
