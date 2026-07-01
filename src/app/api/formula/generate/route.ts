import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a formula generator for a spreadsheet application. Generate JavaScript expressions that transform column data.

STRICT OUTPUT RULES:
- Respond with ONLY the JavaScript code — no markdown, no explanation, no backtick fences
- Reference column values using {{ColumnName}} syntax exactly
- Write a single expression (will be wrapped as: return (<expr>))
- For multi-line logic, write multiple statements ending with: return <value>
- Always guard against null/undefined with || '' or optional chaining ?.
- Available globals: Math, String, Array, Date, JSON, Number, parseFloat, parseInt, Boolean

EXAMPLES:
Task: Extract domain from {{Email}}
Formula: ({{Email}} || '').split('@')[1] || ''

Task: Combine {{First Name}} and {{Last Name}}
Formula: [{{First Name}}, {{Last Name}}].filter(Boolean).join(' ')

Task: If {{Status}} is "Active" return "Yes" else "No"
Formula: {{Status}} === 'Active' ? 'Yes' : 'No'

Task: Count words in {{Bio}}
Formula: ({{Bio}} || '').trim().split(/\\s+/).filter(Boolean).length

Task: Format {{Price}} as USD currency
Formula: Number({{Price}}) ? '$' + Number({{Price}}).toFixed(2) : ''

Task: Calculate days between {{Start Date}} and {{End Date}}
Formula: Math.floor((new Date({{End Date}}) - new Date({{Start Date}})) / 86400000)`;

export async function POST(req: NextRequest) {
  try {
    const { instruction, columns } = await req.json() as {
      instruction: string;
      columns: string[];
    };

    if (!instruction?.trim()) {
      return NextResponse.json({ error: "Instruction is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set in .env.local." },
        { status: 500 }
      );
    }

    const userMessage = `Available columns: ${columns.length ? columns.join(", ") : "(none)"}

Task: ${instruction.trim()}

Formula:`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 256,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[formula/generate] OpenAI error:", body);
      return NextResponse.json(
        { error: `AI API returned ${response.status}.` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const formula = (data.choices?.[0]?.message?.content ?? "").trim();

    return NextResponse.json({ formula });
  } catch (err) {
    console.error("[formula/generate]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
