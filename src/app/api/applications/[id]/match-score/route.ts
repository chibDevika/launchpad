import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MatchBreakdown } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(
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
    .select("user_id, jd_extracted, jd_raw")
    .eq("id", id)
    .single();
  if (!app || app.user_id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!app.jd_extracted)
    return NextResponse.json(
      { error: "JD not extracted yet" },
      { status: 400 },
    );

  const { data: profile } = await supabase
    .from("users")
    .select(
      "base_resume, current_role_title, years_of_experience, extended_profile",
    )
    .eq("id", user.id)
    .single();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: `You are a career advisor. Compare a candidate's resume against a job description. Return ONLY valid JSON. No preamble.

Schema: { "score": integer (0-100), "strengths": string[] (max 4, concise), "gaps": string[] (max 4, concise), "recommendation": "apply"|"stretch"|"skip", "reasoning": string (1-2 sentences, honest and warm) }

Scoring: 70+ = apply, 50-69 = stretch, below 50 = skip. Be honest — an accurate skip is more valuable than false encouragement.

If <extended_profile> is present, treat it as additional signal about the candidate beyond the resume. Skills, ownership patterns, or experiences mentioned there that are relevant to the JD should positively influence the score and appear in strengths where applicable. Do not ignore it.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `<resume>${JSON.stringify(profile?.base_resume ?? {})}</resume>`,
              profile?.extended_profile
                ? `<extended_profile>${JSON.stringify(profile.extended_profile)}</extended_profile>`
                : "",
              `<jd_extracted>${JSON.stringify(app.jd_extracted)}</jd_extracted>`,
            ]
              .filter(Boolean)
              .join("\n"),
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: "Compute the match score.",
          },
        ],
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";
  const text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const matchBreakdown: MatchBreakdown = JSON.parse(text);

  await supabase
    .from("applications")
    .update({
      match_score: matchBreakdown.score,
      match_breakdown: matchBreakdown,
    })
    .eq("id", id);

  return NextResponse.json({ matchBreakdown });
}
