export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import type { UserProfile, Application } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: applications }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (!profile?.onboarding_complete) redirect("/onboarding");

  return (
    <DashboardClient
      profile={profile as UserProfile}
      applications={(applications as Application[]) ?? []}
    />
  );
}
