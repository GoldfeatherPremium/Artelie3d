"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState(searchParams.get("email") ?? "");
  const [message, setMessage] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);
    setLoading(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${baseUrl}/auth/verify-email`,
        },
      });

      if (error) throw error;

      setMessage("Verification email sent — check your inbox.");
    } catch (err) {
      setIsError(true);
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not resend the verification email.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-bronze/10 text-bronze">
          <MailCheck className="h-6 w-6" />
        </span>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We sent a confirmation link to your inbox. Click it to verify your
          email address and activate your account.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleResend}>
        <CardContent className="grid gap-4">
          <Field
            label="Email"
            htmlFor="verify-email-input"
            hint="Didn't receive anything? Enter your email to resend."
          >
            <Input
              id="verify-email-input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          {message ? (
            <p
              role="alert"
              className={
                isError
                  ? "text-caption text-danger"
                  : "text-caption text-success"
              }
            >
              {message}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" size="lg" loading={loading}>
            Resend verification email
          </Button>
          <p className="text-center text-caption text-fog">
            Already verified?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-charcoal underline-offset-4 hover:underline"
            >
              Continue to sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
