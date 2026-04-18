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

  const { data: app } = await supabase
    .from("applications")
    .select("user_id")
    .eq("id", id)
    .single();
  if (!app || app.user_id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { messages } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0)
    return NextResponse.json({ error: "No messages" }, { status: 400 });

  const rows = messages.map((m: { role: string; content: string }) => ({
    application_id: id,
    role: m.role,
    content: m.content,
  }));

  await supabase.from("chat_messages").insert(rows);
  return NextResponse.json({ ok: true });
}
