import { AIAvatar } from "@/components/AIAvatar";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Mic, ChevronRight, Clock, MessageCircle, Shield, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-foreground">OYOS</span>
        </div>

        {/* Auth Controls */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* AI Avatar */}
        <div className="mb-8">
          <AIAvatar state="idle" size="xl" />
        </div>

        {/* Headline */}
        <h1 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4 animate-fade-in">
          Let's have a conversation
        </h1>

        {/* Subheadline */}
        <p className="text-muted-foreground text-center max-w-md mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          I'm here to learn about your experience. Speak naturally and honestly — 
          this usually takes 10-15 minutes.
        </p>

        {/* Benefits */}
        <div className="flex flex-wrap justify-center gap-4 mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>10-15 minutes</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span>Natural conversation</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span>100% confidential</span>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          size="lg"
          onClick={() => {
            if (user) {
              navigate("/conversation");
            } else {
              navigate("/auth");
            }
          }}
          className="group gradient-accent text-white border-0 shadow-accent-glow hover:scale-105 transition-all duration-300 text-lg px-8 py-6 rounded-full animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <Mic className="w-5 h-5 mr-2" />
          {user ? "Start Conversation" : "Sign In to Start"}
          <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
        </Button>

        {/* Secondary Link */}
        <button
          onClick={() => {}}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          How does this work?
        </button>
      </main>

      {/* Footer */}
      <footer className="p-6">
        <PrivacyBadge variant="detailed" />
      </footer>
    </div>
  );
}
