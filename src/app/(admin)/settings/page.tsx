import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/input";
import { savePlatformSettings } from "@/app/actions/admin";

interface StoredSettings {
  id: string;
  properties: unknown;
  created_at: string;
}

function prettyJson(value: unknown): string {
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  await requireRole(["admin"]);
  const db = createServiceClient();

  const { data: latest } = await db
    .from("analytics_events")
    .select("id, properties, created_at")
    .eq("event_type", "platform_settings")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const settings = (latest as StoredSettings | null) ?? null;
  const settingsJson = settings ? prettyJson(settings.properties) : "";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Settings</h1>
        <p className="text-body-sm text-fog">Platform-wide configuration stored as JSON.</p>
      </div>

      {sp.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-body-sm text-danger" role="alert">
          {sp.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Platform settings</CardTitle>
          <CardDescription>
            Stored as a JSON object on analytics_events (event_type = platform_settings). The latest
            saved version wins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings ? (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="success">Settings loaded</Badge>
              <span className="text-caption text-fog">
                Saved {format(new Date(settings.created_at), "MMM d, yyyy HH:mm")}
              </span>
            </div>
          ) : null}
          <form action={savePlatformSettings}>
            <Field label="Settings JSON" htmlFor="settings-json">
              <Textarea
                id="settings-json"
                name="json"
                defaultValue={settingsJson}
                rows={14}
                spellCheck={false}
                className="font-mono text-caption"
                placeholder='{\n  "siteName": "ATELIER 3D",\n  "currency": "USD"\n}'
              />
            </Field>
            <div className="mt-4">
              <Button type="submit">Save settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
