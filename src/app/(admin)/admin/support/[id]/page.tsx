import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/input";
import { ConfirmButton, type ActionResult } from "@/components/admin/admin-shell";
import { replyTicket, resolveTicket } from "@/app/actions/admin";

interface TicketMessage {
  id: string;
  author_role: string;
  body: string;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
}

interface TicketDetail {
  id: string;
  subject: string;
  issue_type: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  profiles: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null;
  support_messages: TicketMessage[];
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

function openerLabel(ticket: TicketDetail): string {
  const profile = first(ticket.profiles);
  return profile?.full_name ?? profile?.email ?? "Customer";
}

function messageAuthor(message: TicketMessage): string {
  if (message.author_role === "admin") return "ATELIER Team";
  const profile = first(message.profiles);
  return profile?.full_name ?? profile?.email ?? "Customer";
}

interface TicketPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminTicketPage({ params, searchParams }: TicketPageProps) {
  await requireRole(["admin"]);
  const { id } = await params;
  const sp = await searchParams;
  const db = createServiceClient();

  const { data } = await db
    .from("support_tickets")
    .select(
      "id, subject, issue_type, status, priority, created_at, updated_at, profiles(email, full_name), support_messages(id, author_role, body, created_at, profiles(full_name, email))",
    )
    .eq("id", id)
    .order("created_at", { ascending: true, foreignTable: "support_messages" })
    .maybeSingle();

  if (!data) notFound();

  const ticket = data as unknown as TicketDetail;
  const resolved = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/support" className="text-body-sm text-fog transition-colors hover:text-ink">
          ← All tickets
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-display-md text-ink">{ticket.subject}</h1>
            <p className="text-body-sm text-fog">
              {openerLabel(ticket)} · {ticket.issue_type ?? "General"} · opened{" "}
              {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={PRIORITY_VARIANT[ticket.priority] ?? "neutral"}>{ticket.priority}</Badge>
            <Badge variant={STATUS_VARIANT[ticket.status] ?? "neutral"}>{ticket.status}</Badge>
          </div>
        </div>
      </div>

      {sp.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-body-sm text-danger" role="alert">
          {sp.error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ol className="grid gap-4">
            {ticket.support_messages.map((message) => (
              <li
                key={message.id}
                className={`rounded-2xl border border-line p-5 ${
                  message.author_role === "admin" ? "bg-bronze/5" : "bg-paper"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-caption font-medium uppercase tracking-wider text-fog">
                    {messageAuthor(message)}
                  </p>
                  <p className="text-caption text-fog">{new Date(message.created_at).toLocaleString()}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-body-sm text-ink/85">{message.body}</p>
              </li>
            ))}
          </ol>

          <form action={replyTicket.bind(null, ticket.id)} className="mt-6 rounded-2xl border border-line bg-paper p-6">
            <Field label="Reply" htmlFor="ticket-reply">
              <Textarea
                id="ticket-reply"
                name="body"
                required
                rows={4}
                placeholder="Write a message to the customer…"
              />
            </Field>
            <div className="mt-4">
              <Button type="submit">Send reply</Button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-line bg-paper p-6">
            <h2 className="font-display text-title-md text-ink">Ticket actions</h2>
            <p className="mt-1 text-body-sm text-fog">
              Resolving closes this ticket and notifies the customer.
            </p>
            <div className="mt-4">
              {resolved ? (
                <Button type="button" variant="outline" disabled>
                  Resolved
                </Button>
              ) : (
                <ConfirmButton
                  title="Resolve ticket"
                  description={`Mark “${ticket.subject}” as resolved? The customer will be notified.`}
                  confirmLabel="Resolve ticket"
                  variant="primary"
                  action={resolveTicket.bind(null, ticket.id) as () => Promise<ActionResult>}
                >
                  Resolve ticket
                </ConfirmButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
