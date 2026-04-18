import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const { currentRole } = await request.json();
  if (!currentRole?.trim()) return NextResponse.json({ suggestions: [] });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: [
      {
        type: "text",
        text: `You suggest next career moves. Given a current job title, return 6 relevant job titles the person might target next. Return ONLY a JSON array of strings. No preamble, no markdown.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Current role: ${currentRole}`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "[]";
  const text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const suggestions: string[] = JSON.parse(text);
  return NextResponse.json({ suggestions });
}
