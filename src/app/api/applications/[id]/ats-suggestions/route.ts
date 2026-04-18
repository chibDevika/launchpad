import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .select("user_id, jd_extracted")
    .eq("id", id)
    .single();
  if (!app || app.user_id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!app.jd_extracted)
    return NextResponse.json({ error: "No JD extracted yet" }, { status: 400 });

  const { data: profile } = await supabase
    .from("users")
    .select("base_resume, extended_profile")
    .eq("id", user.id)
    .single();
  if (!profile?.base_resume)
    return NextResponse.json({ error: "No base resume" }, { status: 400 });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: `You are an ATS (Applicant Tracking System) expert and career coach. Your job is to give the candidate specific, actionable suggestions to improve their resume's chances of passing ATS screening for a given role — along with exact before/after copy so they can make the edit themselves.

Return ONLY a valid JSON array. No preamble, no markdown fences, no explanation outside the JSON.

Each suggestion must be an object with exactly these fields:
- "what": short headline describing what to change (be specific — name the exact keyword or phrase)
- "location": where in the resume to make the change (e.g. "Skills section", "Senior Engineer bullet at Acme Corp", "Professional Summary")
- "reason": why this helps with ATS (e.g. "appears 4× in JD", "JD uses 'ETL workflows' but resume says 'data pipelines'")
- "replace_this": the exact current text that should be changed, quoted verbatim from the resume. Use null if this is a pure addition with no text to replace.
- "with_this": the exact text to add or substitute, ready to copy-paste. Write in the candidate's existing voice — match their tone, tense, and style from the resume.
- "priority": one of "High", "Medium", or "Low"
  - "High" = required skill from JD that is completely absent from the resume
  - "Medium" = skill is present but the exact JD keyword is missing (terminology mismatch)
  - "Low" = nice-to-have alignment or minor phrasing improvement

Rules:
- Only flag things that are genuinely missing or mismatched — do not invent vague advice
- Do not suggest fabricating experience the candidate doesn't have
- Focus on: missing keywords, language mirroring gaps, implied skills not made explicit
- Maximum 8 suggestions. Quality over quantity.
- If the resume already covers a skill well with matching keywords, do not mention it
- Sort results: all High first, then Medium, then Low

Extended profile rules (important):
- After analysing resume vs JD gaps, also check <extended_profile> for anything the candidate mentioned that closes those gaps
- If the extended profile mentions a skill, project, or ownership pattern that the JD emphasises but the resume lacks, surface it as a High or Medium suggestion with "you mentioned X in your profile — this could be added here" framing in the "reason" field
- Do not ignore the extended profile if it seems redundant with the resume — it may contain more specific or candid detail worth using`,
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
              `<resume>${JSON.stringify(profile.base_resume)}</resume>`,
              `<jd_extracted>${JSON.stringify(app.jd_extracted)}</jd_extracted>`,
              profile.extended_profile
                ? `<extended_profile>${JSON.stringify(profile.extended_profile)}</extended_profile>`
                : "",
            ]
              .filter(Boolean)
              .join("\n"),
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: "Give me the ATS suggestions JSON array.",
          },
        ],
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "[]";
  const text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const suggestions = JSON.parse(text);
    return NextResponse.json({ suggestions });
  } catch {
    console.error("[ats-suggestions] Failed to parse response:", text);
    return NextResponse.json({ suggestions: [] });
  }
}
