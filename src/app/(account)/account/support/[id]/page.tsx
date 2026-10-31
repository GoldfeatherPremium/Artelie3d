import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { TicketThread } from "@/components/account/ticket-thread";

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params;
  const user = await requireUser();
  const db = createServiceClient();

  const { data: ticketData } = await db
    .from("support_tickets")
    .select("id, subject, issue_type, status, created_at, support_messages(id, author_role, body, created_at)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ticketData) notFound();

  const ticket = ticketData as unknown as {
    id: string;
    subject: string;
    issue_type: string | null;
    status: string;
    created_at: string;
    support_messages: { id: string; author_role: string; body: string; created_at: string }[];
  };

  return (
    <div>
      <Link href="/account/support" className="text-body-sm text-fog transition-colors hover:text-ink">← All tickets</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-title-lg text-ink">{ticket.subject}</h2>
          <p className="text-caption text-fog">{ticket.issue_type ?? "General"} · opened {new Date(ticket.created_at).toLocaleString()}</p>
        </div>
        <Badge variant={ticket.status === "resolved" ? "success" : ticket.status === "open" ? "warning" : "neutral"}>{ticket.status}</Badge>
      </div>

      <TicketThread ticketId={ticket.id} messages={ticket.support_messages} />
    </div>
  );
}
