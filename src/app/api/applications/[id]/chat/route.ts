import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const anthropic = new Anthropic();

const SYSTEM = `You are a sharp, warm job application assistant embedded in Launchpad. Help the candidate put their best foot forward for this specific role.

Your primary job: answer application form questions on the spot — salary guidance, talking points, fit assessment, motivation answers, and cover letters.

When writing a cover letter, always generate a complete, targeted letter — never a template. Infer the target region from the job location in <role_metadata> and adapt tone, length, and emphasis:
- Australia / UK: warm, less formal, cultural fit language
- US: crisp, metric-heavy, tight one page
- Germany / Central Europe: structured, slightly longer narrative acceptable
- Indian corporate: professional, not casual

Cover letter content rules (always apply):
- Open with a specific hook — why this company, why this role. No filler openers ("I am writing to express...")
- Map the candidate's strongest 2–3 experiences directly to JD requirements
- Include at least one quantified achievement
- Close with a confident call to action
- No generic claims
- Match the candidate's voice from their base resume in <resume>
- If <extended_profile> is present, treat it as a second pool of signal. Prefer experiences, skills, or ownership patterns from the extended profile when they are more specific or compelling than what is on the resume. Never ignore the extended profile — it often contains the most candid and differentiated material.

For all other responses: keep answers concise — 2-3 sentences unless clearly needed. Tone: warm, direct, never corporate — like a smart friend who has done this before.

When <extended_profile> is present and relevant to the user's question, draw from it. Talking points, motivation answers, and "why this role" responses should actively surface what the candidate shared there — it is often more authentic than anything on the resume.`;

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
    .select("user_id, jd_extracted, match_breakdown, company_name, role_title")
    .eq("id", id)
    .single();
  if (!app || app.user_id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("users")
    .select("base_resume, tone_preference, extended_profile")
    .eq("id", user.id)
    .single();

  // messages = full conversation including the current user message
  const { messages: allMessages } = await request.json();
  if (!Array.isArray(allMessages) || allMessages.length === 0)
    return NextResponse.json({ error: "No messages" }, { status: 400 });

  const jd = app.jd_extracted as Record<string, unknown> | null;
  const contextBlock = [
    "<role_metadata>",
    `Company: ${app.company_name ?? jd?.company ?? "Unknown"}`,
    `Title: ${app.role_title ?? jd?.role_title ?? "Unknown"}`,
    `Location: ${jd?.location ?? "Unknown"}`,
    `Seniority: ${jd?.seniority ?? "Unknown"}`,
    "</role_metadata>",
    `<resume>${JSON.stringify(profile?.base_resume ?? {})}</resume>`,
    profile?.extended_profile
      ? `<extended_profile>${JSON.stringify(profile.extended_profile)}</extended_profile>`
      : "",
    `<jd_extracted>${JSON.stringify(app.jd_extracted ?? {})}</jd_extracted>`,
    `<match_breakdown>${JSON.stringify(app.match_breakdown ?? {})}</match_breakdown>`,
    `<tone_preference>${profile?.tone_preference ?? "balanced"}</tone_preference>`,
  ]
    .filter(Boolean)
    .join("\n");

  // Inject context as a prefixed block into the first user turn
  const anthropicMessages: Anthropic.MessageParam[] = allMessages.map(
    (m: { role: "user" | "assistant"; content: string }, i: number) => {
      if (i === 0 && m.role === "user") {
        return {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: contextBlock,
              cache_control: { type: "ephemeral" } as const,
            },
            { type: "text" as const, text: m.content },
          ],
        };
      }
      return { role: m.role, content: m.content };
    },
  );

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: anthropicMessages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
