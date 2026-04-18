import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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

  // Verify the application belongs to this user
  const { data: app } = await supabase
    .from("applications")
    .select("user_id")
    .eq("id", id)
    .single();
  if (!app || app.user_id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { stage_name, stage_date, notes } = await request.json();
  if (!stage_name?.trim() || !stage_date) {
    return NextResponse.json(
      { error: "stage_name and stage_date are required" },
      { status: 400 },
    );
  }

  const { data: stage, error } = await supabase
    .from("application_stages")
    .insert({
      application_id: id,
      stage_name: stage_name.trim(),
      stage_date,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[stages] Insert failed:", error);
    return NextResponse.json({ error: "Failed to add stage" }, { status: 500 });
  }

  // Bump application updated_at so staleness badge reflects stage changes
  await supabase
    .from("applications")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ stage });
}

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

  const { stage_id, notes } = await request.json();
  if (!stage_id)
    return NextResponse.json({ error: "stage_id required" }, { status: 400 });

  // Verify the stage belongs to this application and user
  const { data: stage } = await supabase
    .from("application_stages")
    .select("application_id")
    .eq("id", stage_id)
    .single();
  if (!stage || stage.application_id !== id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: app } = await supabase
    .from("applications")
    .select("user_id")
    .eq("id", id)
    .single();
  if (!app || app.user_id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: updated } = await supabase
    .from("application_stages")
    .update({ notes: notes?.trim() || null })
    .eq("id", stage_id)
    .select()
    .single();

  return NextResponse.json({ stage: updated });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: app } = await supabase
    .from("applications")
    .select("user_id")
    .eq("id", id)
    .single();
  if (!app || app.user_id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: stages } = await supabase
    .from("application_stages")
    .select("*")
    .eq("application_id", id)
    .order("stage_date", { ascending: true });

  return NextResponse.json({ stages: stages ?? [] });
}
