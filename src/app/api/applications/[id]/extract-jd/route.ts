import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { JDExtracted } from "@/lib/types";

const anthropic = new Anthropic();

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

  const { jdText } = await request.json();
  if (!jdText?.trim())
    return NextResponse.json({ error: "No JD text" }, { status: 400 });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: `You are a job description parser. Extract structured data and return ONLY valid JSON. No preamble, no markdown.

Schema:
{
  "role_title": string,
  "company": string,
  "location": string | null,
  "target_persona": string | null,
  "years_required": string | null,
  "required_skills": string[],
  "tools_technologies": string[],
  "certifications": string[],
  "nice_to_haves": string[],
  "benefits": string[],
  "seniority": string,
  "employment_type": string
}

Rules:
- location: city/country or "Remote" or "Hybrid — London" etc. null if not mentioned.
- target_persona: 1 sentence describing who the role is for, from the JD. null if not clear.
- years_required: e.g. "3+ years", "5–8 years". null if not specified.
- required_skills: must-have skills and competencies (not tools).
- tools_technologies: specific tools, platforms, frameworks, languages.
- certifications: required or preferred certs. Empty array if none.
- nice_to_haves: preferred but not required skills or experience.
- benefits: perks, compensation details, culture mentions.
- seniority: entry/mid/senior/lead/principal/executive
- employment_type: full-time/part-time/contract/internship`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Parse this job description:\n\n${jdText.slice(0, 8000)}`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";
  const text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const jdExtracted: JDExtracted = JSON.parse(text);

  await supabase
    .from("applications")
    .update({
      jd_raw: jdText,
      jd_extracted: jdExtracted,
      company_name: jdExtracted.company || null,
      role_title: jdExtracted.role_title || null,
    })
    .eq("id", id);

  return NextResponse.json({ jdExtracted });
}
