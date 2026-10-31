import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RoomActions } from "@/components/account/room-actions";

export default async function RoomsPage() {
  const user = await requireUser();
  const db = createServiceClient();

  const { data } = await db
    .from("rooms")
    .select("id, name, template_key, is_public, share_token, updated_at, objects")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const rooms = (data ?? []) as unknown as {
    id: string;
    name: string;
    template_key: string;
    is_public: boolean;
    share_token: string | null;
    updated_at: string;
    objects: unknown;
  }[];

  return (
    <div>
      <h2 className="font-display text-title-lg text-ink">My room designs</h2>

      {rooms.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No room designs yet"
            description="Design a room in the Room Designer and save it here."
            action={<Link href="/room-designer" className="text-body-sm font-medium text-bronze hover:text-ink">Open Room Designer →</Link>}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {rooms.map((room) => {
            const objectCount = Array.isArray(room.objects) ? room.objects.length : 0;
            return (
              <li key={room.id} className="rounded-2xl border border-line bg-paper p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-ink">{room.name}</h3>
                    <p className="mt-0.5 text-caption text-fog">
                      <span className="capitalize">{room.template_key.replaceAll("_", " ")}</span> · {objectCount} object{objectCount === 1 ? "" : "s"} · updated {new Date(room.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.is_public ? <Badge variant="bronze">Public</Badge> : <Badge variant="neutral">Private</Badge>}
                  </div>
                </div>
                <RoomActions roomId={room.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
