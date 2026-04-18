export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NewApplicationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: app, error } = await supabase
    .from("applications")
    .insert({ user_id: user.id, status: "Saved" })
    .select("id")
    .single();

  if (error || !app) redirect("/tracker");
  redirect(`/applications/${app.id}`);
}
