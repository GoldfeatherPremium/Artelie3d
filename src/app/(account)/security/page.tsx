"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function SecurityPage() {
  const toast = useToast();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast.toast({ title: "Password updated", description: "Use your new password next time you sign in.", variant: "success" });
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setPending(false);
    }
  }

  async function resendVerification() {
    setPending(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) throw new Error("Not signed in");
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.toast({ title: "Verification email sent", variant: "success" });
    } catch (err) {
      toast.toast({ title: "Could not send", description: err instanceof Error ? err.message : "Try again.", variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Use at least 8 characters.</CardDescription>
        </CardHeader>
        <form onSubmit={changePassword}>
          <CardContent className="grid gap-4">
            <Field label="New password" htmlFor="sec-pass">
              <Input id="sec-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label="Confirm new password" htmlFor="sec-confirm">
              <Input id="sec-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            {error ? <p className="text-caption text-danger" role="alert">{error}</p> : null}
            <div>
              <Button type="submit" loading={pending}>Update password</Button>
            </div>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
          <CardDescription>Resend the verification email for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={resendVerification} disabled={pending}>
            Resend verification email
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
