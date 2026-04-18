import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowed = [
    "status",
    "notes",
    "company_name",
    "role_title",
    "job_url",
    "applied_via_referral",
    "reached_out_to_hm",
    "channels",
    "custom_tags",
    "attached_resume_url",
  ];
  const update = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k)),
  );

  // Single query: user_id in WHERE serves as ownership check.
  // If the row doesn't belong to this user, updated will be null.
  const { data: updated } = await supabase
    .from("applications")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ application: updated });
}
