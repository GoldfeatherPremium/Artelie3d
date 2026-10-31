"use client";

import * as React from "react";
import Link from "next/link";
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

export default function ResetPasswordPage() {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirm) {
      setIsError(true);
      setMessage("Passwords do not match.");
      return;
    }

    setMessage(null);
    setIsError(false);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setIsError(false);
      setMessage("Your password has been updated successfully.");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setIsError(true);
      setMessage(
        raw.toLowerCase().includes("session")
          ? "Your reset link is invalid or has expired. Please request a new one."
          : raw || "Could not reset your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const succeeded = message !== null && !isError;

  if (succeeded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>
            Your password has been changed. You can now sign in with your new
            password.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/auth/login" className="w-full">
            <Button size="lg" className="w-full">
              Continue to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          Choose a strong password you haven't used before.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          <Field
            label="New password"
            htmlFor="reset-password"
            hint="At least 6 characters."
          >
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <Field
            label="Confirm new password"
            htmlFor="reset-password-confirm"
          >
            <Input
              id="reset-password-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
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

        <CardFooter>
          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
