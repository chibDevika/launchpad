import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(ext ?? "")) {
      return NextResponse.json(
        { error: "Only PDF and DOCX files are supported" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let rawText = "";

    if (ext === "pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buffer);
      rawText = parsed.text;
    } else {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from the file" },
        { status: 422 },
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: `You are a resume parser. Extract structured data and return ONLY valid JSON. No preamble, no markdown fences.

Return this exact schema:
{
  "profile": {
    "full_name": string,
    "current_role_title": string,
    "current_company": string | null,
    "years_of_experience": number
  },
  "resume": {
    "summary": string | null,
    "contact": { "phone": string | null, "location": string | null },
    "experience": [{ "company": string, "title": string, "start_date": string, "end_date": string | null, "location": string | null, "bullets": string[] }],
    "skills": string[] | { [category: string]: string[] },
    "education": [{ "institution": string, "degree": string, "field": string | null, "graduation_year": number | null }],
    "projects": [{ "name": string, "tech": string | null, "date": string | null, "url": string | null, "bullets": string[] }] | null,
    "links": { [key: string]: string }
  },
  "format": {
    "fontFamily": string,
    "sectionOrder": string[],
    "dateStyle": string,
    "headerAlignment": string
  }
}

Rules:
- full_name: person's name from the resume header
- current_role_title: most recent job title
- current_company: most recent employer (null if not clear)
- years_of_experience: integer, calculated from earliest to latest role
- end_date is null if the role is current
- skills: if the resume groups skills under labeled headings (e.g. "Languages: Python, JS" or "Tools | Frameworks"), return an object with those category names as keys and arrays of skills as values. Otherwise return a flat string array.
- projects: extract any "Projects", "Personal Projects", or "Side Projects" section. null if none exists.
- links keys: "linkedin", "github", "portfolio", or similar label from the resume
- format.fontFamily: best guess — "Garamond", "Georgia", "Arial", "Calibri", "Times New Roman", or "Helvetica". Traditional/executive → "Garamond". Modern/tech → "Calibri" or "Arial". Academic → "Times New Roman".
- format.sectionOrder: ordered list of section keys as they appear in the resume. Use keys: "summary", "experience", "skills", "education", "projects". Include all sections present.
- format.dateStyle: how dates are written, e.g. "Jan 2020", "01/2020", "January 2020", "2020"
- format.headerAlignment: "centered" if name/contact block appears centered, "left" if left-aligned`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Parse this resume:\n\n${rawText.slice(0, 12000)}`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";
    const text = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(text);
    return NextResponse.json({
      profile: parsed.profile,
      resume: parsed.resume,
      format: parsed.format ?? null,
    });
  } catch (err) {
    console.error("parse-resume error:", err);
    return NextResponse.json(
      { error: "Failed to parse resume" },
      { status: 500 },
    );
  }
}
