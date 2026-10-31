"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createTicket } from "@/app/actions/customer";

export function NewTicket() {
  const router = useRouter();
  const toast = useToast();
  const [subject, setSubject] = React.useState("");
  const [issueType, setIssueType] = React.useState("general");
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await createTicket({ subject, issueType, message });
      if (result.ok) {
        toast.toast({ title: "Ticket created", description: "Our team will reply soon.", variant: "success" });
        setSubject("");
        setMessage("");
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-line bg-paper p-6">
      <h3 className="font-display text-title-md text-ink">Open a new ticket</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Subject" htmlFor="tk-subject" className="sm:col-span-2">
          <Input id="tk-subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="How can we help?" />
        </Field>
        <Field label="Issue type" htmlFor="tk-type">
          <Select id="tk-type" value={issueType} onChange={(e) => setIssueType(e.target.value)}>
            <option value="general">General</option>
            <option value="order">Order question</option>
            <option value="product">Product question</option>
            <option value="shipping">Shipping / delivery</option>
            <option value="return">Returns / refund</option>
            <option value="technical">Technical issue</option>
          </Select>
        </Field>
        <div className="hidden sm:block" />
        <Field label="Message" htmlFor="tk-message" className="sm:col-span-2">
          <Textarea id="tk-message" required value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Describe the issue…" />
        </Field>
      </div>
      {error ? <p className="mt-3 text-caption text-danger" role="alert">{error}</p> : null}
      <div className="mt-4">
        <Button type="submit" loading={pending}>Submit ticket</Button>
      </div>
    </form>
  );
}
