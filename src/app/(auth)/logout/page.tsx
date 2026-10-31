"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LogoutState = "signing-out" | "error";

export default function LogoutPage() {
  const router = useRouter();
  const [state, setState] = React.useState<LogoutState>("signing-out");
  const [retrying, setRetrying] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function signOut() {
      try {
        await supabase.auth.signOut();
        if (!cancelled) {
          router.replace("/");
          router.refresh();
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void signOut();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleRetry() {
    setRetrying(true);
    try {
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setState("error");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signing out</CardTitle>
        <CardDescription>
          {state === "signing-out"
            ? "Please wait while we sign you out of ATELIER 3D."
            : "We couldn't sign you out. Please try again."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {state === "signing-out" ? (
          <div className="flex items-center justify-center py-6">
            <span
              aria-hidden
              className="h-8 w-8 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal"
            />
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={handleRetry}
            loading={retrying}
          >
            Try signing out again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
