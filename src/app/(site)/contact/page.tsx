"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, Mail, MapPin } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Reveal } from "@/components/motion/reveal";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Contact",
  description: "Get in touch with the ATELIER 3D team — questions about orders, customization, delivery or returns.",
};

type ActionResult = { ok: true } | { ok: false; error: string };

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120, "Name is too long"),
  email: z.string().trim().email("Please enter a valid email address").max(254, "Email is too long"),
  subject: z.string().trim().min(1, "Please add a subject").max(200, "Subject is too long"),
  message: z.string().trim().min(10, "Message should be at least 10 characters").max(5000, "Message is too long"),
});

async function submitContactMessage(formData: FormData): Promise<ActionResult> {
  "use server";

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

export default function ContactPage() {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setError(null);
    try {
      const result = await submitContactMessage(new FormData(form));
      if (result.ok) {
        toast.toast({
          title: "Message sent",
          description: "Thanks — we will get back to you shortly.",
          variant: "success",
        });
        form.reset();
      } else {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <Reveal>
          <p className="text-caption font-medium uppercase tracking-[0.18em] text-bronze">Contact</p>
          <h1 className="mt-2 font-display text-display-xl text-ink">We are here to help</h1>
          <p className="mt-4 max-w-2xl text-body-lg text-fog">
            Questions about an order, a custom configuration, delivery or a return? Send us a
            note and the right person will reply within one business day.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          {/* Form */}
          <Reveal className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="rounded-3xl border border-line bg-paper p-6 shadow-card sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="contact-name">
                  <Input id="contact-name" name="name" required autoComplete="name" placeholder="Your full name" maxLength={120} />
                </Field>
                <Field label="Email" htmlFor="contact-email">
                  <Input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    maxLength={254}
                  />
                </Field>
                <Field label="Subject" htmlFor="contact-subject" className="sm:col-span-2">
                  <Input id="contact-subject" name="subject" required placeholder="What is this about?" maxLength={200} />
                </Field>
                <Field label="Message" htmlFor="contact-message" className="sm:col-span-2">
                  <Textarea id="contact-message" name="message" required rows={6} placeholder="Tell us a little more…" maxLength={5000} />
                </Field>
              </div>

              {error ? (
                <p className="mt-4 rounded-lg bg-danger/10 px-3.5 py-2.5 text-body-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex items-center gap-4">
                <Button type="submit" size="lg" loading={pending}>
                  Send message
                </Button>
                <p className="text-caption text-fog">We usually reply within one business day.</p>
              </div>
            </form>
          </Reveal>

          {/* Details */}
          <Reveal delay={0.12} className="lg:col-span-2">
            <div className="flex h-full flex-col gap-4">
              <div className="rounded-2xl border border-line bg-paper p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bronze/15 text-bronze">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <h2 className="mt-4 font-display text-title-md text-ink">Email</h2>
                <p className="mt-1 text-body-sm text-fog">For general questions and press.</p>
                <a href="mailto:hello@atelier3d.example" className="mt-2 inline-block text-body-sm font-medium text-bronze transition-colors hover:text-ink">
                  hello@atelier3d.example
                </a>
              </div>

              <div className="rounded-2xl border border-line bg-paper p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bronze/15 text-bronze">
                  <MapPin className="h-4.5 w-4.5" />
                </span>
                <h2 className="mt-4 font-display text-title-md text-ink">Showroom</h2>
                <p className="mt-1 text-body-sm text-fog">
                  Demo location — appointments by request.
                  <br />
                  212 Atelier Way, New York, NY
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-paper p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bronze/15 text-bronze">
                  <Clock className="h-4.5 w-4.5" />
                </span>
                <h2 className="mt-4 font-display text-title-md text-ink">Hours</h2>
                <p className="mt-1 text-body-sm text-fog">Monday – Friday, 9:00 – 18:00 (ET).</p>
              </div>

              <div className="flex-1 rounded-2xl bg-charcoal p-6 text-ivory">
                <p className="font-display text-title-md text-ivory">Looking for answers first?</p>
                <p className="mt-2 text-body-sm text-ivory/70">
                  Our FAQ covers orders, customization, delivery and returns.
                </p>
                <Link href="/faqs" className="mt-4 inline-block text-body-sm font-medium text-bronze transition-colors hover:text-ivory">
                  Read the FAQ →
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
