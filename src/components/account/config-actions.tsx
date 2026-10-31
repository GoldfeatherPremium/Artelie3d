"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Share2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/components/cart/cart-provider";
import {
  renameConfiguration,
  duplicateConfiguration,
  deleteConfiguration,
} from "@/app/actions/customer";

interface ConfigActionsProps {
  configId: string;
  productId: string;
  options: Record<string, string>;
  shareToken: string | null;
  initialName: string;
}

export function ConfigActions({ configId, productId, options, shareToken, initialName }: ConfigActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const { addItem } = useCart();
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [name, setName] = React.useState(initialName);
  const [pending, setPending] = React.useState(false);

  const confirm = async (action: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setPending(true);
    try {
      const result = await action();
      if (result.ok) {
        toast.toast({ title: "Done", description: success, variant: "success" });
        router.refresh();
      } else {
        toast.toast({ title: "Action failed", description: result.error, variant: "error" });
      }
    } finally {
      setPending(false);
    }
  };

  const share = async () => {
    if (shareToken) {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/c/${shareToken}`);
        toast.toast({ title: "Copied", description: "Share link copied to clipboard.", variant: "success" });
        return;
      } catch {
        // fall through to open dialog
      }
    }
    toast.toast({ title: "Share link unavailable", description: "Save the configuration first to generate a share link." });
  };

  const addToBag = async () => {
    try {
      await addItem({ productId, configuration: options });
      toast.toast({ title: "Added to your bag", variant: "success" });
    } catch (err) {
      toast.toast({ title: "Could not add", description: err instanceof Error ? err.message : "Try again.", variant: "error" });
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={addToBag}>
        <Plus className="h-3.5 w-3.5" /> Add to bag
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setRenameOpen(true)}>
        <Pencil className="h-3.5 w-3.5" /> Rename
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => confirm(() => duplicateConfiguration(configId), "Configuration duplicated.")}>
        <Copy className="h-3.5 w-3.5" /> Duplicate
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={share}>
        <Share2 className="h-3.5 w-3.5" /> Share
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => confirm(() => deleteConfiguration(configId), "Configuration deleted.")}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>
      <Link href={shareToken ? `/c/${shareToken}` : "#"} className="hidden">Public view</Link>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename configuration</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Field label="Name" htmlFor="config-rename">
              <Input id="config-rename" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)} disabled={pending}>Cancel</Button>
            <Button
              type="button"
              loading={pending}
              disabled={!name.trim()}
              onClick={() => {
                void confirm(() => renameConfiguration(configId, name.trim()), "Configuration renamed.").then(() => setRenameOpen(false));
              }}
            >
              Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
