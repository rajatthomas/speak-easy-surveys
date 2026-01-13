import { Shield, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrivacyBadgeProps {
  variant?: "minimal" | "detailed";
  className?: string;
}

export function PrivacyBadge({ variant = "minimal", className }: PrivacyBadgeProps) {
  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
        <Lock className="w-4 h-4" />
        <span>Private & Encrypted</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
      <div className="flex items-center gap-2 text-primary">
        <Shield className="w-5 h-5" />
        <span className="font-medium">Private & Confidential</span>
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">
        Your responses are encrypted and analyzed anonymously. 
        We never share individual responses.
      </p>
    </div>
  );
}
