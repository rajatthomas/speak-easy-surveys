import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface TranscriptBubbleProps {
  text: string;
  sender: "user" | "ai";
  isComplete?: boolean;
  className?: string;
}

export function TranscriptBubble({
  text,
  sender,
  isComplete = false,
  className,
}: TranscriptBubbleProps) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3 animate-fade-in",
        sender === "user"
          ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
          : "mr-auto bg-card text-card-foreground rounded-bl-md shadow-md border border-border",
        className
      )}
    >
      <p className="text-sm leading-relaxed">{text}</p>
      {sender === "user" && isComplete && (
        <div className="flex justify-end mt-1">
          <Check className="w-4 h-4 opacity-70" />
        </div>
      )}
    </div>
  );
}
