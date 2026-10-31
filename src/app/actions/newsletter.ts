"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";

const emailSchema = z.string().email();

export async function subscribeToNewsletter(email: string): Promise<{ ok: boolean }> {
  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) throw new Error("Please enter a valid email address");

  const db = createServiceClient();
  const { error } = await db.from("analytics_events").insert({
    event_type: "newsletter_signup",
    properties: { email: parsed.data },
  });
  if (error) throw new Error("Could not subscribe right now");
  return { ok: true };
}
