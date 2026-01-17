import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Preferences {
  dark_mode: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  session_reminders: boolean;
  voice_coaching: boolean;
  data_sharing: boolean;
}

interface PreferencesGridProps {
  preferences: Preferences;
  onChange: (key: keyof Preferences, value: boolean) => void;
}

const preferenceItems: { key: keyof Preferences; label: string }[] = [
  { key: "dark_mode", label: "Dark Mode" },
  { key: "push_notifications", label: "Push Notifications" },
  { key: "email_notifications", label: "Email Notifications" },
  { key: "session_reminders", label: "Session Reminders" },
  { key: "voice_coaching", label: "Voice Coaching" },
  { key: "data_sharing", label: "Data Sharing" },
];

export default function PreferencesGrid({ preferences, onChange }: PreferencesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {preferenceItems.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
        >
          <Label htmlFor={item.key} className="text-sm font-medium text-foreground">
            {item.label}
          </Label>
          <Switch
            id={item.key}
            checked={preferences[item.key]}
            onCheckedChange={(checked) => onChange(item.key, checked)}
          />
        </div>
      ))}
    </div>
  );
}
