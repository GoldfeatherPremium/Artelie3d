import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
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

interface TicketRow {
  id: string;
  subject: string;
  issue_type: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  profiles: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "neutral"> = {
  open: "warning",
  pending: "default",
  resolved: "success",
  closed: "neutral",
};

const PRIORITY_VARIANT: Record<string, "default" | "danger" | "warning" | "neutral"> = {
  urgent: "danger",
  high: "warning",
  normal: "neutral",
  low: "neutral",
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function userLabel(ticket: TicketRow): string {
  const profile = first(ticket.profiles);
  return profile?.full_name ?? profile?.email ?? "Customer";
}

export default async function AdminSupportPage() {
  await requireRole(["admin"]);
  const db = createServiceClient();

  const { data: rows } = await db
    .from("support_tickets")
    .select("id, subject, issue_type, status, priority, created_at, updated_at, profiles(email, full_name)")
    .order("updated_at", { ascending: false })
    .limit(200);
  const tickets = (rows ?? []) as unknown as TicketRow[];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Support</h1>
        <p className="text-body-sm text-fog">Customer support tickets across the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
          <CardDescription>{tickets.length} ticket(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <EmptyState title="No tickets" description="Customer support tickets will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Link href={`/admin/support/${ticket.id}`} className="font-medium text-ink hover:underline">
                        {ticket.subject}
                      </Link>
                      {ticket.issue_type ? (
                        <div className="text-caption text-fog">{ticket.issue_type}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-fog">{userLabel(ticket)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[ticket.status] ?? "neutral"}>{ticket.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_VARIANT[ticket.priority] ?? "neutral"}>{ticket.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-fog">{format(new Date(ticket.updated_at), "MMM d, yyyy")}</TableCell>
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
