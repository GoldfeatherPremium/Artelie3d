import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationActions } from "@/components/account/notification-actions";

export default async function NotificationsPage() {
  const user = await requireUser();
  const db = createServiceClient();

  const { data } = await db
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as unknown as {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    read_at: string | null;
    created_at: string;
  }[];

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-title-lg text-ink">Notifications</h2>
        {unread > 0 ? <Badge variant="bronze">{unread} unread</Badge> : null}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No notifications" description="Updates about your orders, save and support will appear here." />
        </div>
      ) : (
        <>
          <div className="mt-4 flex justify-end">
            <NotificationActions markAllRead />
          </div>
          <ul className="mt-4 grid gap-3">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={
                  notification.read_at
                    ? "rounded-2xl border border-line bg-paper p-5"
                    : "rounded-2xl border border-bronze/40 bg-bronze/5 p-5"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{notification.title}</p>
                    {notification.body ? <p className="mt-1 text-body-sm text-ink/75">{notification.body}</p> : null}
                    <p className="mt-2 text-caption text-fog">{new Date(notification.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {notification.link ? (
                      <Link href={notification.link} className="text-body-sm font-medium text-bronze transition-colors hover:text-ink">
                        View
                      </Link>
                    ) : null}
                    {!notification.read_at ? <NotificationActions markRead notificationId={notification.id} /> : null}
                    <NotificationActions dismiss notificationId={notification.id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
