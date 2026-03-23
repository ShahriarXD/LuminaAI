import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Briefcase, Heart, Target, Sliders, Trash2, AlertTriangle } from "lucide-react";

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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("name, profession, interests, goals, preferences")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setProfile({
        name: data.name || "",
        profession: data.profession || "",
        interests: data.interests || "",
        goals: data.goals || "",
        preferences: data.preferences || "",
      });
    } else if (!data && !error) {
      // No profile exists yet — will upsert on save
      setProfile({});
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); toast.error("Not authenticated"); return; }

    const updatePayload = {
      name: profile.name || "",
      profession: profile.profession || "",
      interests: profile.interests || "",
      goals: profile.goals || "",
      preferences: profile.preferences || "",
    };

    // Try update first
    const { data: updated, error: updateErr } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", user.id)
      .select("id");

    if (updateErr) {
      toast.error("Failed to save: " + updateErr.message);
      setSaving(false);
      return;
    }

    // If no rows updated, insert
    if (!updated || updated.length === 0) {
      const { error: insertErr } = await supabase
        .from("profiles")
        .insert({ user_id: user.id, ...updatePayload });
      if (insertErr) {
        toast.error("Failed to save: " + insertErr.message);
        setSaving(false);
        return;
      }
    }

    toast.success("Profile saved!");
    setSaving(false);
  };

  const handleClearAllData = async () => {
    setClearing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setClearing(false); return; }

    try {
      // Delete all memories
      const { error: memErr } = await supabase
        .from("memories")
        .delete()
        .eq("user_id", user.id);
      if (memErr) console.error("Failed to delete memories:", memErr);

      // Get all user's chats
      const { data: userChats } = await supabase
        .from("chats")
        .select("id")
        .eq("user_id", user.id);

      if (userChats && userChats.length > 0) {
        const chatIds = userChats.map(c => c.id);

        // Delete messages for each chat
        for (const chatId of chatIds) {
          await supabase.from("messages").delete().eq("chat_id", chatId);
        }

        // Delete all chats
        const { error: chatErr } = await supabase
          .from("chats")
          .delete()
          .eq("user_id", user.id);
        if (chatErr) console.error("Failed to delete chats:", chatErr);
      }

      toast.success("All chats and memories have been deleted");
      setShowClearConfirm(false);
    } catch (e) {
      toast.error("Failed to clear data");
    }
    setClearing(false);
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

            {/* Danger Zone */}
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 pt-6 border-t border-border/50"
            >
              <h3 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Danger Zone
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                This will permanently delete all your chats, messages, and saved memories. This action cannot be undone.
              </p>

              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-2.5 text-sm font-medium text-destructive transition-all duration-200 hover:bg-destructive/10 hover:border-destructive/50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All Chats & Memories
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-destructive text-center">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearAllData}
                      disabled={clearing}
                      className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground transition-all duration-200 hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {clearing ? "Deleting..." : "Yes, Delete All"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
