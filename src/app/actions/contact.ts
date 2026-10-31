"use server";

import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120, "Name is too long"),
  email: z.string().trim().email("Please enter a valid email address").max(254, "Email is too long"),
  subject: z.string().trim().min(1, "Please add a subject").max(200, "Subject is too long"),
  message: z.string().trim().min(10, "Message should be at least 10 characters").max(5000, "Message is too long"),
});

export async function submitContactMessage(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = contactSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Please review the form fields." };
    }

    const db = createServiceClient();
    const user = await getUser();

    if (user) {
      // Authenticated users get a real support ticket.
      const { data: ticket, error } = await db
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: parsed.data.subject,
          issue_type: "contact",
          status: "open",
          priority: "normal",
        })
        .select("id")
        .maybeSingle();

      if (error || !ticket) {
        return { ok: false, error: error?.message ?? "Could not submit your message." };
      }

      const { error: msgError } = await db.from("support_messages").insert({
        ticket_id: (ticket as { id: string }).id,
        author_id: user.id,
        author_role: "customer",
        body: `${parsed.data.name} <${parsed.data.email}>:\n\n${parsed.data.message}`,
      });

      if (msgError) {
        return { ok: false, error: msgError.message };
      }
    } else {
      // Guests are logged to analytics for follow-up without exposing personal rows.
      const { error } = await db.from("analytics_events").insert({
        event_type: "contact_submission",
        properties: {
          name: parsed.data.name,
          email: parsed.data.email,
          subject: parsed.data.subject,
          message: parsed.data.message,
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Something went wrong — please try again.",
    };
  }
}
