import Link from "next/link";
import { requireUser, getProfile } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { ProfileSettingsForm } from "@/components/account/profile-settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const db = createServiceClient();

  const { data: prefs } = await db
    .from("notification_preferences")
    .select("email_enabled, in_app_enabled, topics")
    .eq("user_id", user.id)
    .maybeSingle();

  const preferences = prefs as { email_enabled: boolean; in_app_enabled: boolean; topics: string[] } | null;

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-title-lg text-ink">Profile</h2>
        <ProfileSettingsForm
          initialFullName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
          initialEmail={profile?.email ?? user.email ?? ""}
          initialEmailVerified={profile?.email_verified ?? false}
          initialPrefs={{
            emailEnabled: preferences?.email_enabled ?? true,
            inAppEnabled: preferences?.in_app_enabled ?? true,
            topics: preferences?.topics ?? ["order_update", "payment_update", "shipping_update"],
          }}
        />
      </div>
      <p className="text-caption text-fog">
        Manage your password and sign-in methods on the <Link href="/account/security" className="text-bronze hover:text-ink">Security</Link> page.
      </p>
    </div>
  );
}
