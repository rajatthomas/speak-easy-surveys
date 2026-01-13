import { cn } from "@/lib/utils";
import { Mic, MicOff, Square } from "lucide-react";

interface VoiceButtonProps {
  isListening: boolean;
  isDisabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  className?: string;
}

export function VoiceButton({
  isListening,
  isDisabled = false,
  onStart,
  onStop,
  className,
}: VoiceButtonProps) {
  return (
    <button
      onClick={isListening ? onStop : onStart}
      disabled={isDisabled}
      className={cn(
        "relative group flex items-center justify-center transition-all duration-300",
        "w-20 h-20 rounded-full",
        "focus:outline-none focus:ring-4 focus:ring-primary/30",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isListening 
          ? "bg-accent shadow-accent-glow" 
          : "gradient-hero shadow-glow hover:scale-105",
        className
      )}
      aria-label={isListening ? "Stop recording" : "Start recording"}
    >
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-accent/50 animate-ping" />
          <span 
            className="absolute -inset-2 rounded-full bg-accent/20 animate-pulse-ring" 
          />
        </>
      )}
      
      {/* Icon */}
      <span className="relative z-10 text-white">
        {isListening ? (
          <Square className="w-8 h-8 fill-current" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </span>
    </button>
  );
}
