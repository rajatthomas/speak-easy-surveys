import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const feedbackOptions = [
  "This felt natural and easy",
  "This was too long",
  "I had technical issues",
  "I didn't feel comfortable sharing",
];

export default function CompletionPage() {
  const navigate = useNavigate();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);

  const handleFeedbackToggle = (option: string) => {
    setSelectedFeedback((prev) =>
      prev.includes(option)
        ? prev.filter((f) => f !== option)
        : [...prev, option]
    );
  };

  const handleClose = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Success Icon */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center animate-fade-in">
          <div className="w-16 h-16 rounded-full gradient-hero flex items-center justify-center shadow-glow">
            <Check className="w-8 h-8 text-white" />
          </div>
        </div>
        {/* Celebration particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/40"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${10 + Math.random() * 80}%`,
                animation: `float ${2 + Math.random()}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 animate-fade-in">
        Conversation Complete!
      </h1>

      {/* Message */}
      <p className="text-muted-foreground text-center max-w-sm mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        Thank you for sharing openly and honestly. Your insights will help
        improve our workplace for everyone.
      </p>

      <p className="text-sm text-muted-foreground text-center mb-10 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        Your responses have been sent anonymously to the leadership team.
      </p>

      {/* Feedback Card */}
      <div 
        className="w-full max-w-md bg-card rounded-2xl p-6 shadow-lg border border-border animate-slide-up"
        style={{ animationDelay: "0.2s" }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick Feedback (Optional)
        </h2>

        {/* Star Rating */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">
            How was this experience?
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? "fill-accent text-accent"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Options */}
        <div className="flex flex-wrap gap-2 mb-6">
          {feedbackOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleFeedbackToggle(option)}
              className={`px-3 py-2 rounded-full text-sm transition-all ${
                selectedFeedback.includes(option)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Submit Feedback */}
        {(rating > 0 || selectedFeedback.length > 0) && (
          <Button
            className="w-full gradient-hero text-white"
            onClick={handleClose}
          >
            Submit Feedback
          </Button>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="mt-6 text-muted-foreground hover:text-foreground transition-colors"
      >
        Close
      </button>
    </div>
  );
}
