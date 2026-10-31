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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to continue shopping at ATELIER 3D.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          <Field label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <div className="flex items-center justify-between">
            <Link
              href="/auth/forgot-password"
              className="text-caption text-fog transition-colors hover:text-ink"
            >
              Forgot password?
            </Link>
          </div>

          {error ? (
            <p role="alert" className="text-caption text-danger">
              {error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" size="lg" loading={loading}>
            Sign in
          </Button>
          <p className="text-center text-caption text-fog">
            New to ATELIER 3D?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-charcoal underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
