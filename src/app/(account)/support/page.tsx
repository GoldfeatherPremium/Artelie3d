import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NewTicket } from "@/components/account/new-ticket";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "neutral"> = {
  open: "warning",
  pending: "default",
  resolved: "success",
  closed: "neutral",
};

export default async function SupportPage() {
  const user = await requireUser();
  const db = createServiceClient();

  const { data } = await db
    .from("support_tickets")
    .select("id, subject, issue_type, status, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const tickets = (data ?? []) as unknown as {
    id: string;
    subject: string;
    issue_type: string | null;
    status: string;
    updated_at: string;
  }[];

  return (
    <div>
      <h2 className="font-display text-title-lg text-ink">Support</h2>
      <p className="mt-1 text-body-sm text-fog">Reach our team — we typically reply within one business day.</p>

      <NewTicket />

      {tickets.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No tickets yet" description="Your support requests will appear here." />
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link href={`/account/support/${ticket.id}`} className="block rounded-2xl border border-line bg-paper p-5 transition-shadow hover:shadow-raised">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{ticket.subject}</p>
                    <p className="mt-0.5 text-caption text-fog">
                      {ticket.issue_type ?? "General"} · updated {new Date(ticket.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[ticket.status] ?? "neutral"}>{ticket.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
