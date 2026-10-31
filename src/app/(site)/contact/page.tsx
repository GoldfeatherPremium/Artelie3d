"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Reveal } from "@/components/motion/reveal";
import { submitContactMessage } from "@/app/actions/contact";

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
