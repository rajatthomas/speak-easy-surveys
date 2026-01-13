import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  isActive: boolean;
  variant?: "user" | "ai";
  className?: string;
}

export function AudioWaveform({ isActive, variant = "user", className }: AudioWaveformProps) {
  const barCount = 9;
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center gap-0.5 h-8 px-4",
        className
      )}
    >
      {[...Array(barCount)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "wave-bar w-1 rounded-full transition-all duration-150",
            variant === "user" ? "bg-accent" : "bg-primary",
            isActive ? "animate-wave" : "h-1"
          )}
          style={{
            height: isActive ? undefined : "4px",
            animationDelay: `${Math.abs(i - Math.floor(barCount / 2)) * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}
