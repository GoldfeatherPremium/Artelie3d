"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, CheckCheck } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead, dismissNotification } from "@/app/actions/customer";

interface NotificationActionsProps {
  markRead?: boolean;
  markAllRead?: boolean;
  dismiss?: boolean;
  notificationId?: string;
}

export function NotificationActions({ markRead, markAllRead, dismiss, notificationId }: NotificationActionsProps) {
  const router = useRouter();

  if (markAllRead) {
    return (
      <button
        type="button"
        onClick={() => void markAllNotificationsRead().then(() => router.refresh())}
        className="inline-flex items-center gap-1.5 rounded-full text-body-sm font-medium text-bronze transition-colors hover:text-ink"
      >
        <CheckCheck className="h-4 w-4" /> Mark all as read
      </button>
    );
  }

  if (markRead && notificationId) {
    return (
      <button
        type="button"
        aria-label="Mark as read"
        onClick={() => void markNotificationRead(notificationId).then(() => router.refresh())}
        className="rounded-full p-1.5 text-fog transition-colors hover:text-success"
      >
        <Check className="h-4 w-4" />
      </button>
    );
  }

  if (dismiss && notificationId) {
    return (
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => void dismissNotification(notificationId).then(() => router.refresh())}
        className="rounded-full p-1.5 text-fog transition-colors hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return null;
}
