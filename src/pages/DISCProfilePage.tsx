import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DISCFactorsCard from "@/components/dashboard/DISCFactorsCard";
import { useNavigate } from "react-router-dom";

interface DISCProfile {
  dominance: number;
  influence: number;
  steadiness: number;
  compliance: number;
  key_traits: string[];
  recommendations: string[];
  updated_at: string;
}

export default function DISCProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<DISCProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("disc_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setProfile(data);
        }
      } catch (error) {
        console.error("Failed to fetch DISC profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Default values if no profile exists
  const displayProfile = profile || {
    dominance: 0,
    influence: 0,
    steadiness: 0,
    compliance: 0,
    key_traits: [],
    recommendations: [],
    updated_at: "",
  };

  const defaultTraits = [
    "Strong analytical thinking",
    "Detail-oriented approach",
    "Collaborative team player",
    "Results-driven mindset",
  ];

  const defaultRecommendations = [
    "Practice active listening in team meetings",
    "Set clear boundaries for work-life balance",
    "Delegate tasks to leverage team strengths",
    "Schedule regular self-reflection sessions",
  ];

  const traits = displayProfile.key_traits.length > 0 ? displayProfile.key_traits : defaultTraits;
  const recommendations = displayProfile.recommendations.length > 0 ? displayProfile.recommendations : defaultRecommendations;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">DISC Profile</h1>
        <p className="text-sm text-muted-foreground">
          Understand your behavioral style and how to leverage your strengths.
        </p>
      </div>

      {/* Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DISCFactorsCard
          dominance={displayProfile.dominance}
          influence={displayProfile.influence}
          steadiness={displayProfile.steadiness}
          compliance={displayProfile.compliance}
          updatedAt={displayProfile.updated_at}
        />

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">
              Profile Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {profile
                ? "Your DISC profile reveals a balanced approach to work and relationships. You demonstrate strong analytical abilities combined with collaborative tendencies, making you effective in both individual and team settings."
                : "Complete a DISC assessment to receive personalized insights about your behavioral style, communication preferences, and work approach."}
            </p>
            <Button
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => navigate("/conversation")}
            >
              {profile ? "Update Your Profile" : "Start Assessment"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">
              Your Key Traits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {traits.map((trait, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-accent mt-1">•</span>
                  <span className="text-muted-foreground">{trait}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
