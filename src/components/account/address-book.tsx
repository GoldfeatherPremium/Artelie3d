"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Checkbox, Field } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { saveAddress, deleteAddress, setDefaultAddress, type AddressInputShape } from "@/app/actions/customer";

interface AddressRow {
  id: string;
  label: string | null;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  is_default: boolean;
}

const EMPTY: AddressInputShape = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "US",
  phone: "",
  isDefault: false,
};

export function AddressBook({ addresses }: { addresses: AddressRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AddressRow | null>(null);
  const [form, setForm] = React.useState<AddressInputShape>(EMPTY);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = (patch: Partial<AddressInputShape>) => setForm((f) => ({ ...f, ...patch }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, isDefault: addresses.length === 0 });
    setError(null);
    setOpen(true);
  };

  const openEdit = (address: AddressRow) => {
    setEditing(address);
    setForm({
      id: address.id,
      label: address.label ?? "",
      fullName: address.full_name,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      region: address.region ?? "",
      postalCode: address.postal_code ?? "",
      country: address.country,
      phone: address.phone ?? "",
      isDefault: address.is_default,
    });
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await saveAddress(form);
      if (result.ok) {
        toast.toast({ title: "Address saved", variant: "success" });
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-8">
      <Button type="button" variant="outline" onClick={openNew}>
        <Plus className="h-4 w-4" /> Add address
      </Button>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {addresses.map((address) => (
          <div key={address.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-paper px-4 py-3">
            <span className="text-body-sm text-ink">
              {address.label ?? address.full_name} — {address.city}, {address.country}
            </span>
            <span className="flex items-center gap-1">
              {!address.is_default ? (
                <button
                  type="button"
                  aria-label="Set as default"
                  onClick={() => void setDefaultAddress(address.id).then(() => router.refresh())}
                  className="rounded-full p-1.5 text-fog transition-colors hover:text-bronze"
                >
                  <Star className="h-4 w-4" />
                </button>
              ) : null}
              <button type="button" aria-label="Edit address" onClick={() => openEdit(address)} className="rounded-full p-1.5 text-fog transition-colors hover:text-ink">
                Edit
              </button>
              <button
                type="button"
                aria-label="Delete address"
                onClick={() => void deleteAddress(address.id).then(() => router.refresh())}
                className="rounded-full p-1.5 text-fog transition-colors hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </span>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit address" : "Add address"}</DialogTitle>
            <DialogDescription>Your addresses are stored securely and used at checkout.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            {error ? <p className="text-caption text-danger" role="alert">{error}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Label" htmlFor="addr-label">
                <Input id="addr-label" value={form.label ?? ""} onChange={(e) => set({ label: e.target.value })} placeholder="Home / Office" />
              </Field>
              <Field label="Full name" htmlFor="addr-name">
                <Input id="addr-name" required value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
              </Field>
              <Field label="Line 1" htmlFor="addr-line1" className="sm:col-span-2">
                <Input id="addr-line1" required value={form.line1} onChange={(e) => set({ line1: e.target.value })} />
              </Field>
              <Field label="Line 2" htmlFor="addr-line2" className="sm:col-span-2">
                <Input id="addr-line2" value={form.line2 ?? ""} onChange={(e) => set({ line2: e.target.value })} placeholder="Optional" />
              </Field>
              <Field label="City" htmlFor="addr-city">
                <Input id="addr-city" required value={form.city} onChange={(e) => set({ city: e.target.value })} />
              </Field>
              <Field label="Region" htmlFor="addr-region">
                <Input id="addr-region" value={form.region ?? ""} onChange={(e) => set({ region: e.target.value })} />
              </Field>
              <Field label="Postal code" htmlFor="addr-zip">
                <Input id="addr-zip" value={form.postalCode ?? ""} onChange={(e) => set({ postalCode: e.target.value })} />
              </Field>
              <Field label="Country" htmlFor="addr-country">
                <Select id="addr-country" value={form.country} onChange={(e) => set({ country: e.target.value })}>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="AU">Australia</option>
                </Select>
              </Field>
              <Field label="Phone" htmlFor="addr-phone" className="sm:col-span-2">
                <Input id="addr-phone" value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox checked={form.isDefault ?? false} onChange={(e) => set({ isDefault: e.target.checked })} />
              <span className="text-body-sm text-ink">Use as default address</span>
            </label>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="button" onClick={submit} loading={pending}>Save address</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
