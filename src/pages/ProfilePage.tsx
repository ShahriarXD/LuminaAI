import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Briefcase, Heart, Target, Sliders } from "lucide-react";

interface ProfilePageProps {
  onBack: () => void;
}

const fields = [
  { key: "name", label: "Name", icon: User, placeholder: "Your name" },
  { key: "profession", label: "Profession", icon: Briefcase, placeholder: "e.g. Software Engineer, Designer, Student" },
  { key: "interests", label: "Interests", icon: Heart, placeholder: "e.g. AI, blockchain, music, photography" },
  { key: "goals", label: "Goals", icon: Target, placeholder: "e.g. Learn new skills, build products, stay informed" },
  { key: "preferences", label: "Preferences", icon: Sliders, placeholder: "e.g. Concise answers, use examples, technical depth" },
] as const;

type ProfileData = Record<string, string>;

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const [profile, setProfile] = useState<ProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("name, profession, interests, goals, preferences")
      .eq("user_id", user.id)
      .single();

    if (data) setProfile(data as ProfileData);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("user_id", user.id);

    if (error) {
      // Profile might not exist yet for existing users
      const { error: insertErr } = await supabase
        .from("profiles")
        .insert({ user_id: user.id, ...profile });
      if (insertErr) toast.error("Failed to save profile");
      else toast.success("Profile saved!");
    } else {
      toast.success("Profile saved!");
    }
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-strong w-full max-w-lg rounded-2xl p-8 shadow-glass"
      >
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="btn-icon-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="font-display text-xl font-bold text-foreground">Profile Settings</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Personalize your AI experience. The assistant will tailor responses based on your profile.
        </p>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, i) => (
              <motion.div
                key={field.key}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                  <field.icon className="h-3.5 w-3.5 text-primary" />
                  {field.label}
                </label>
                {field.key === "interests" || field.key === "goals" || field.key === "preferences" ? (
                  <textarea
                    value={profile[field.key] || ""}
                    onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 resize-none transition-shadow duration-200"
                  />
                ) : (
                  <input
                    type="text"
                    value={profile[field.key] || ""}
                    onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 transition-shadow duration-200"
                  />
                )}
              </motion.div>
            ))}

            <motion.button
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={handleSave}
              disabled={saving}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl gradient-send py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:shadow-glow btn-press disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Profile"}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
