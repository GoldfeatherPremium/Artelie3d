"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Checkbox, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateProfile, saveNotificationPreferences } from "@/app/actions/customer";

interface ProfileSettingsFormProps {
  initialFullName: string;
  initialPhone: string;
  initialEmail: string;
  initialEmailVerified: boolean;
  initialPrefs: { emailEnabled: boolean; inAppEnabled: boolean; topics: string[] };
}

const TOPIC_OPTIONS = [
  { value: "order_update", label: "Order updates" },
  { value: "payment_update", label: "Payment updates" },
  { value: "shipping_update", label: "Shipping updates" },
  { value: "refund_update", label: "Refunds" },
  { value: "payout_update", label: "Payouts" },
  { value: "support_reply", label: "Support replies" },
];

export function ProfileSettingsForm({ initialFullName, initialPhone, initialEmail, initialEmailVerified, initialPrefs }: ProfileSettingsFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [fullName, setFullName] = React.useState(initialFullName);
  const [phone, setPhone] = React.useState(initialPhone);
  const [emailEnabled, setEmailEnabled] = React.useState(initialPrefs.emailEnabled);
  const [inAppEnabled, setInAppEnabled] = React.useState(initialPrefs.inAppEnabled);
  const [topics, setTopics] = React.useState<string[]>(initialPrefs.topics);
  const [pending, setPending] = React.useState(false);

  const toggleTopic = (value: string) => {
    setTopics((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const profileResult = await updateProfile({ fullName, phone });
      const prefsResult = await saveNotificationPreferences({ emailEnabled, inAppEnabled, topics });
      if (profileResult.ok && prefsResult.ok) {
        toast.toast({ title: "Settings saved", variant: "success" });
        router.refresh();
      } else {
        let errMsg: string | null = null;
        if (!profileResult.ok) errMsg = profileResult.error;
        else if (!prefsResult.ok) errMsg = prefsResult.error;
        toast.toast({ title: "Could not save", description: errMsg, variant: "error" });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="set-name">
          <Input id="set-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Phone" htmlFor="set-phone">
          <Input id="set-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="set-email" className="sm:col-span-2">
          <div className="flex items-center gap-3">
            <Input id="set-email" value={initialEmail} readOnly className="bg-ivory" />
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-caption font-medium ${initialEmailVerified ? "bg-success/12 text-success" : "bg-warning/15 text-warning"}`}>
              {initialEmailVerified ? "Verified" : "Unverified"}
            </span>
          </div>
        </Field>
      </div>

      <div className="border-t border-line pt-5">
        <p className="text-body-sm font-medium text-ink">Notification preferences</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} />
            <span className="text-body-sm text-ink">Email notifications</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox checked={inAppEnabled} onChange={(e) => setInAppEnabled(e.target.checked)} />
            <span className="text-body-sm text-ink">In-app notifications</span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TOPIC_OPTIONS.map((topic) => (
            <button
              key={topic.value}
              type="button"
              onClick={() => toggleTopic(topic.value)}
              className={
                topics.includes(topic.value)
                  ? "rounded-full bg-charcoal px-3.5 py-1.5 text-caption font-medium text-ivory"
                  : "rounded-full border border-line bg-paper px-3.5 py-1.5 text-caption text-ink hover:border-bronze"
              }
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Button type="submit" loading={pending}>Save changes</Button>
      </div>
    </form>
  );
}
