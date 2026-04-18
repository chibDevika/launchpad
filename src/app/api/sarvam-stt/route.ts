import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "STT not configured" }, { status: 503 });

  const body = await request.formData();
  const audio = body.get("audio");
  if (!audio || !(audio instanceof Blob))
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });

  const fd = new FormData();
  fd.append("file", audio, "recording.webm");
  fd.append("model", "saarika:v2.5");
  fd.append("language_code", "en-IN");

  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: { "api-subscription-key": apiKey },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[sarvam-stt] API error:", err);
    return NextResponse.json({ error: "STT failed" }, { status: 502 });
  }

  const data = await res.json();
  // Sarvam returns { transcript: string, ... }
  const transcript: string = data.transcript ?? "";
  return NextResponse.json({ transcript });
}
