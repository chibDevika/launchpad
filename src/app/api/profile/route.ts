import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowed = ["extended_profile", "base_resume"];
  const update = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k)),
  );

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { data: updated, error } = await supabase
    .from("users")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error || !updated) {
    console.error("[profile PATCH] Supabase error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
