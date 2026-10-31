"use client";

import * as React from "react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function NewsletterForm() {
  const toast = useToast();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await subscribeToNewsletter(email);
      setEmail("");
      toast.toast({
        title: "You're on the list",
        description: "Welcome to ATELIER 3D. Stories and launches land in your inbox soon.",
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not subscribe right now.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="your@email.com"
          aria-label="Email address"
          className="sm:max-w-sm"
        />
        <Button type="submit" loading={loading} className="sm:w-auto">
          Subscribe
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-caption text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
