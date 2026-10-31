"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { duplicateRoom, deleteRoom, shareRoom } from "@/app/actions/customer";

interface RoomActionsProps {
  roomId: string;
}

export function RoomActions({ roomId }: RoomActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  const run = async (action: () => Promise<{ ok: boolean; error?: string; token?: string }>, success: string) => {
    setPending(true);
    try {
      const result = await action();
      if (result.ok) {
        if (result.token) {
          try {
            await navigator.clipboard.writeText(`${window.location.origin}/room-designer?room=${roomId}&share=${result.token}`);
            toast.toast({ title: "Copied", description: "Share link copied to clipboard.", variant: "success" });
          } catch {
            toast.toast({ title: "Room shared", description: success, variant: "success" });
          }
        } else {
          toast.toast({ title: "Done", description: success, variant: "success" });
        }
        router.refresh();
      } else {
        toast.toast({ title: "Action failed", description: result.error, variant: "error" });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Link href={`/room-designer?room=${roomId}`}>
        <Button type="button" variant="outline" size="sm">Open</Button>
      </Link>
      <Button type="button" variant="outline" size="sm" onClick={() => run(() => duplicateRoom(roomId), "Room duplicated.")}>
        <Copy className="h-3.5 w-3.5" /> Duplicate
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => run(() => shareRoom(roomId), "Room shared.")}>
        <Share2 className="h-3.5 w-3.5" /> Share
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => run(() => deleteRoom(roomId), "Room deleted.")}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>
    </div>
  );
}
