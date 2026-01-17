import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import PreferencesGrid from "@/components/dashboard/PreferencesGrid";

interface Preferences {
  dark_mode: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  session_reminders: boolean;
  voice_coaching: boolean;
  data_sharing: boolean;
}

interface Profile {
  email: string;
  name: string;
  role: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<Profile>({
    email: "",
    name: "",
    role: "",
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [preferences, setPreferences] = useState<Preferences>({
    dark_mode: true,
    push_notifications: true,
    email_notifications: true,
    session_reminders: true,
    voice_coaching: true,
    data_sharing: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email, name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileData) {
          setProfile({
            email: profileData.email || user.email || "",
            name: profileData.name || "",
            role: profileData.role || "",
          });
        } else {
          setProfile((prev) => ({ ...prev, email: user.email || "" }));
        }

        // Fetch preferences
        const { data: prefsData } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (prefsData) {
          setPreferences({
            dark_mode: prefsData.dark_mode,
            push_notifications: prefsData.push_notifications,
            email_notifications: prefsData.email_notifications,
            session_reminders: prefsData.session_reminders,
            voice_coaching: prefsData.voice_coaching,
            data_sharing: prefsData.data_sharing,
          });
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: profile.name, role: profile.role })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;

      setPasswords({ current: "", new: "", confirm: "" });
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = async (key: keyof Preferences, value: boolean) => {
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          ...newPreferences,
        });

      if (error) throw error;
    } catch (error) {
      console.error("Failed to save preference:", error);
      // Revert on error
      setPreferences(preferences);
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
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Account & Password Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Information */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="pr-10 bg-muted"
                />
                <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm">Role</Label>
              <Input
                id="role"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                placeholder="e.g., Manager, Developer"
              />
            </div>

            <Button
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Update Password */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">
              Update Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-sm">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              />
            </div>

            <Button
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={handleUpdatePassword}
              disabled={saving || !passwords.new || !passwords.confirm}
            >
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preferences */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PreferencesGrid
            preferences={preferences}
            onChange={handlePreferenceChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
