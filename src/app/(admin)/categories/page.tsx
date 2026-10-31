import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { saveCategory } from "@/app/actions/admin";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

const CATEGORY_SELECT =
  "id, name, slug, parent_id, description, image_url, sort_order, created_at";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const db = createServiceClient();

  const { data: rows } = await db
    .from("categories")
    .select(CATEGORY_SELECT)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(200);
  const categories = (rows ?? []) as unknown as CategoryRow[];

  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const editing = sp.edit ? categories.find((c) => c.id === sp.edit) ?? null : null;
  const parentOptions = categories.filter((c) => c.id !== editing?.id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-display-md text-ink">Categories</h1>
          <p className="text-body-sm text-fog">Organize the catalog with a nested category tree.</p>
        </div>
        {editing ? (
          <Link
            href="/admin/categories"
            className="inline-flex h-9 items-center rounded-full border border-charcoal/20 px-3 text-body-sm font-medium text-ink transition-colors hover:border-charcoal/50 hover:bg-charcoal/5"
          >
            + New category
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>{categories.length} category(ies)</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <EmptyState title="No categories yet" description="Create your first category below." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="font-medium text-ink">{category.name}</div>
                      {category.description ? (
                        <div className="text-caption text-fog">{category.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-fog">{category.slug}</TableCell>
                    <TableCell className="text-fog">
                      {category.parent_id ? (nameById.get(category.parent_id) ?? "—") : "—"}
                    </TableCell>
                    <TableCell>{category.sort_order}</TableCell>
                    <TableCell className="text-fog">{format(new Date(category.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Link
                          href={`/admin/categories?edit=${category.id}`}
                          className="inline-flex h-9 items-center rounded-full border border-charcoal/20 px-3 text-body-sm font-medium text-ink transition-colors hover:border-charcoal/50 hover:bg-charcoal/5"
                        >
                          Edit
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? `Edit category · ${editing.name}` : "Create category"}</CardTitle>
          <CardDescription>
            {editing ? "Update the category details below." : "Add a new category to the catalog."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveCategory} className="grid gap-4 sm:grid-cols-2">
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <Field label="Name" htmlFor="cat-name">
              <Input id="cat-name" name="name" required maxLength={120} defaultValue={editing?.name ?? ""} placeholder="e.g. Seating" />
            </Field>
            <Field label="Slug" htmlFor="cat-slug">
              <Input id="cat-slug" name="slug" maxLength={160} defaultValue={editing?.slug ?? ""} placeholder="Auto-generated from name" />
            </Field>
            <Field label="Parent category" htmlFor="cat-parent" className="sm:col-span-2">
              <Select id="cat-parent" name="parent_id" defaultValue={editing?.parent_id ?? ""}>
                <option value="">None (top-level)</option>
                {parentOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Description" htmlFor="cat-description" className="sm:col-span-2">
              <Textarea id="cat-description" name="description" rows={2} defaultValue={editing?.description ?? ""} placeholder="Optional short description" />
            </Field>
            <Field label="Image URL" htmlFor="cat-image" className="sm:col-span-2">
              <Input id="cat-image" name="image_url" maxLength={2000} defaultValue={editing?.image_url ?? ""} placeholder="https://…" />
            </Field>
            <Field label="Sort order" htmlFor="cat-sort">
              <Input id="cat-sort" type="number" name="sort_order" step="1" defaultValue={editing?.sort_order ?? 0} />
            </Field>
            <div className="flex items-end">
              <Button type="submit">{editing ? "Update category" : "Create category"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
