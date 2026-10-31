import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { truncate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  created_at: string;
  profiles: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function changesPreview(value: unknown): string {
  if (value == null) return "—";
  try {
    return truncate(JSON.stringify(value), 160);
  } catch {
    return "—";
  }
}

function actorLabel(row: AuditRow): string {
  const profile = first(row.profiles);
  if (profile?.full_name) return profile.full_name;
  if (profile?.email) return profile.email;
  return "System";
}

export default async function AdminAuditPage() {
  await requireRole(["admin"]);
  const db = createServiceClient();

  const { data: rows } = await db
    .from("audit_logs")
    .select("id, actor_id, actor_role, action, entity_type, entity_id, before, after, created_at, profiles(email, full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  const logs = (rows ?? []) as unknown as AuditRow[];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Audit log</h1>
        <p className="text-body-sm text-fog">Immutable trail of sensitive admin actions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest {logs.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <EmptyState title="No audit entries" description="Actions will be recorded here as admins make changes." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-fog">
                      {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-ink">{actorLabel(log)}</div>
                      {log.actor_role ? (
                        <Badge variant={log.actor_role === "admin" ? "default" : "neutral"} className="mt-0.5">
                          {log.actor_role}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-ink">{log.action}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-ink">{log.entity_type ?? "—"}</div>
                      {log.entity_id ? (
                        <div className="text-caption text-fog">#{log.entity_id.slice(0, 8)}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="font-mono text-xs text-fog">
                        {log.before != null ? (
                          <span className="text-danger/70">{changesPreview(log.before)} → </span>
                        ) : null}
                        {changesPreview(log.after)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
