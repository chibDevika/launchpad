export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrackerClient from "./TrackerClient";
import type { Application, UserStatusBucket } from "@/lib/types";

const DEFAULT_BUCKETS: Omit<
  UserStatusBucket,
  "id" | "user_id" | "created_at"
>[] = [
  { name: "Saved", color: "#64748B", position: 0 },
  { name: "Applied", color: "#2563EB", position: 1 },
  { name: "Phone Screen", color: "#7C3AED", position: 2 },
  { name: "Interview", color: "#D97706", position: 3 },
  { name: "Offer", color: "#059669", position: 4 },
  { name: "Rejected", color: "#EF4444", position: 5 },
  { name: "Withdrawn", color: "#94A3B8", position: 6 },
];

export default async function TrackerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch buckets and applications in parallel
  const [{ data: bucketsRaw }, { data: applications }] = await Promise.all([
    supabase
      .from("user_status_buckets")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  let buckets = bucketsRaw;
  if (!buckets || buckets.length === 0) {
    const { data: seeded } = await supabase
      .from("user_status_buckets")
      .insert(DEFAULT_BUCKETS.map((b) => ({ ...b, user_id: user.id })))
      .select();
    buckets = seeded ?? [];
  }

  return (
    <TrackerClient
      applications={(applications as Application[]) ?? []}
      buckets={(buckets as UserStatusBucket[]) ?? []}
    />
  );
}
