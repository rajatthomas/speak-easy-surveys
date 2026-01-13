import { cn } from "@/lib/utils";

interface AIAvatarProps {
  state?: "idle" | "listening" | "speaking" | "thinking";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
  xl: "w-48 h-48",
};

const ringClasses = {
  sm: "w-20 h-20",
  md: "w-32 h-32",
  lg: "w-40 h-40",
  xl: "w-56 h-56",
};

const outerRingClasses = {
  sm: "w-24 h-24",
  md: "w-40 h-40",
  lg: "w-48 h-48",
  xl: "w-64 h-64",
};

export function AIAvatar({ state = "idle", size = "lg", className }: AIAvatarProps) {
  const isActive = state === "listening" || state === "speaking";
  
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer pulse ring */}
      <div
        className={cn(
          "absolute rounded-full bg-primary/10 transition-all duration-500",
          outerRingClasses[size],
          isActive && "animate-pulse-ring"
        )}
      />
      
      {/* Middle ring */}
      <div
        className={cn(
          "absolute rounded-full bg-primary/20 transition-all duration-300",
          ringClasses[size],
          state === "listening" && "bg-accent/20",
          isActive && "animate-pulse-ring"
        )}
        style={{ animationDelay: "0.3s" }}
      />
      
      {/* Core avatar */}
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center transition-all duration-300",
          sizeClasses[size],
          state === "idle" && "gradient-hero animate-breathe shadow-glow",
          state === "listening" && "gradient-accent shadow-accent-glow",
          state === "speaking" && "gradient-hero shadow-glow animate-breathe",
          state === "thinking" && "gradient-hero opacity-80"
        )}
      >
        {/* Inner glow */}
        <div className="absolute inset-2 rounded-full bg-white/20 blur-sm" />
        
        {/* Voice wave visualization */}
        {state === "listening" && (
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="wave-bar w-1 bg-white rounded-full animate-wave"
                style={{ 
                  height: "8px",
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
        
        {/* Speaking indicator */}
        {state === "speaking" && (
          <div className="flex items-center justify-center gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-white rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
        
        {/* Idle/Thinking icon */}
        {(state === "idle" || state === "thinking") && (
          <svg
            viewBox="0 0 24 24"
            className={cn(
              "w-1/3 h-1/3 text-white",
              state === "thinking" && "animate-pulse"
            )}
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        )}
      </div>
    </div>
  );
}
