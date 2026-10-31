"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { requestCancellationAction, requestRefundAction } from "@/app/actions/order-actions";

interface OrderActionsProps {
  orderId: string;
  status: string;
  maxRefundCents: number;
}

export function OrderActions({ orderId, status, maxRefundCents }: OrderActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(""); 
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canCancel = status === "confirmed" || status === "processing";
  const canRefund = ["pending_payment", "confirmed", "processing", "ready_to_ship", "shipped"].includes(status);

  const run = async (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (result.ok) {
        toast.toast({ title: "Done", description: "The request has been submitted.", variant: "success" });
        setCancelOpen(false);
        setRefundOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  };

  if (!canCancel && !canRefund) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {canCancel ? (
        <Button type="button" variant="outline" onClick={() => setCancelOpen(true)}>
          Request cancellation
        </Button>
      ) : null}
      {canRefund ? (
        <Button type="button" variant="outline" onClick={() => setRefundOpen(true)}>
          Request refund
        </Button>
      ) : null}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request cancellation</DialogTitle>
            <DialogDescription>Your request will be reviewed by our team.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {error ? <p className="mb-3 text-caption text-danger" role="alert">{error}</p> : null}
            <p className="text-body-sm text-fog">Cancellation is only available for confirmed or processing orders.</p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCancelOpen(false)} disabled={pending}>Keep order</Button>
            <Button type="button" loading={pending} onClick={() => run(() => requestCancellationAction(orderId))}>Request cancellation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a refund</DialogTitle>
            <DialogDescription>Refunds are reviewed and processed by our team.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            {error ? <p className="text-caption text-danger" role="alert">{error}</p> : null}
            <Field label={`Amount (max $${(maxRefundCents / 100).toFixed(2)})`} htmlFor="refund-amount">
              <Input id="refund-amount" type="number" min={1} max={maxRefundCents / 100} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Reason" htmlFor="refund-reason">
              <Input id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you requesting a refund?" />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRefundOpen(false)} disabled={pending}>Cancel</Button>
            <Button
              type="button"
              loading={pending}
              disabled={!amount || Number(amount) <= 0}
              onClick={() =>
                run(() =>
                  requestRefundAction({
                    orderId,
                    amountCents: Math.round(Number(amount) * 100),
                    reason: reason.trim(),
                  }),
                )
              }
            >
              Submit refund request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
