import { format } from "date-fns";
import { Search } from "lucide-react";
import { requireRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmButton, type ActionResult } from "@/components/admin/admin-shell";
import { updateUserRole } from "@/app/actions/admin";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

function roleBadgeVariant(role: string): "default" | "info" | "neutral" {
  if (role === "admin") return "default";
  if (role === "seller") return "info";
  return "neutral";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const currentUser = await getUser();
  const db = createServiceClient();

  let query = db
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: rows } = await query;
  const profiles = (rows ?? []) as unknown as ProfileRow[];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-display-md text-ink">Users</h1>
          <p className="text-body-sm text-fog">Profiles and roles across the platform.</p>
        </div>
        <form method="get" className="flex w-full max-w-sm gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fog" />
            <Input name="q" defaultValue={q} placeholder="Search name or email" className="pl-9" />
          </div>
          <Button type="submit" variant="outline">Search</Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profiles</CardTitle>
          <CardDescription>{profiles.length} profiles{q ? ` matching “${q}”` : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <EmptyState title="No users found" description="Try a different search." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => {
                  const isSelf = profile.id === currentUser?.id;
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="font-medium text-ink">{profile.full_name ?? "Unnamed"}</div>
                      </TableCell>
                      <TableCell className="text-fog">{profile.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(profile.role)}>{profile.role}</Badge>
                      </TableCell>
                      <TableCell className="text-fog">{format(new Date(profile.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {isSelf ? (
                            <Button variant="ghost" size="sm" disabled>
                              Current admin
                            </Button>
                          ) : profile.role === "customer" ? (
                            <>
                              <ConfirmButton
                                title="Promote to seller"
                                description={`${profile.full_name ?? "This user"} will gain seller access and a seller dashboard.`}
                                confirmLabel="Promote"
                                variant="outline"
                                action={updateUserRole.bind(null, profile.id, "seller") as () => Promise<ActionResult>}
                              >
                                Make seller
                              </ConfirmButton>
                              <ConfirmButton
                                title="Promote to admin"
                                description={`${profile.full_name ?? "This user"} will gain full admin access.`}
                                confirmLabel="Promote"
                                action={updateUserRole.bind(null, profile.id, "admin") as () => Promise<ActionResult>}
                              >
                                Make admin
                              </ConfirmButton>
                            </>
                          ) : profile.role === "seller" ? (
                            <>
                              <ConfirmButton
                                title="Demote to customer"
                                description={`${profile.full_name ?? "This user"} will lose seller access.`}
                                confirmLabel="Demote"
                                variant="outline"
                                action={updateUserRole.bind(null, profile.id, "customer") as () => Promise<ActionResult>}
                              >
                                Demote
                              </ConfirmButton>
                              <ConfirmButton
                                title="Promote to admin"
                                description={`${profile.full_name ?? "This user"} will gain full admin access.`}
                                confirmLabel="Promote"
                                action={updateUserRole.bind(null, profile.id, "admin") as () => Promise<ActionResult>}
                              >
                                Make admin
                              </ConfirmButton>
                            </>
                          ) : (
                            <>
                              <ConfirmButton
                                title="Demote to seller"
                                description={`${profile.full_name ?? "This user"} will lose admin access but keep seller access.`}
                                confirmLabel="Demote"
                                variant="outline"
                                action={updateUserRole.bind(null, profile.id, "seller") as () => Promise<ActionResult>}
                              >
                                Demote to seller
                              </ConfirmButton>
                              <ConfirmButton
                                title="Demote to customer"
                                description={`${profile.full_name ?? "This user"} will lose admin and seller access.`}
                                confirmLabel="Demote"
                                variant="danger"
                                action={updateUserRole.bind(null, profile.id, "customer") as () => Promise<ActionResult>}
                              >
                                Demote to customer
                              </ConfirmButton>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
