"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${baseUrl}/auth/verify-email`,
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        router.push(
          `/auth/verify-email?email=${encodeURIComponent(email.trim())}`,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Join ATELIER 3D to save designs and track orders.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          <Field label="Full name" htmlFor="register-name">
            <Input
              id="register-name"
              type="text"
              autoComplete="name"
              placeholder="Alex Rivera"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </Field>

          <Field label="Email" htmlFor="register-email">
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="register-password"
            hint="At least 6 characters."
          >
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {error ? (
            <p role="alert" className="text-caption text-danger">
              {error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" size="lg" loading={loading}>
            Create account
          </Button>
          <p className="text-center text-caption text-fog">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-charcoal underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
