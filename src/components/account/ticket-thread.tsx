"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { replyTicketCustomer } from "@/app/actions/customer";

interface Message {
  id: string;
  author_role: string;
  body: string;
  created_at: string;
}

export function TicketThread({ ticketId, messages }: { ticketId: string; messages: Message[] }) {
  const router = useRouter();
  const toast = useToast();
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await replyTicketCustomer(ticketId, body);
      if (result.ok) {
        toast.toast({ title: "Sent", variant: "success" });
        setBody("");
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6">
      <ol className="grid gap-4">
        {messages.map((message) => (
          <li key={message.id} className={`rounded-2xl border border-line p-5 ${message.author_role === "customer" ? "bg-paper" : "bg-bronze/5"}`}>
            <div className="flex items-center justify-between">
              <p className="text-caption font-medium uppercase tracking-wider text-fog">
                {message.author_role === "customer" ? "You" : "ATELIER Team"}
              </p>
              <p className="text-caption text-fog">{new Date(message.created_at).toLocaleString()}</p>
            </div>
            <p className="mt-2 text-body-sm text-ink/85">{message.body}</p>
          </li>
        ))}
      </ol>

      <form onSubmit={reply} className="rounded-2xl border border-line bg-paper p-6">
        <Field label="Reply" htmlFor="ticket-reply">
          <Textarea id="ticket-reply" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write a message…" />
        </Field>
        {error ? <p className="mt-2 text-caption text-danger" role="alert">{error}</p> : null}
        <div className="mt-4">
          <Button type="submit" loading={pending} disabled={!body.trim()}>Send reply</Button>
        </div>
      </form>
    </div>
  );
}
