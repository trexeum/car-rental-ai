import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge || "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const message =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    const customerPhone = message?.from;
    const customerText = message?.text?.body;

    if (!customerText || !customerPhone) {
      return NextResponse.json({ ok: true });
    }

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a WhatsApp AI assistant for a luxury car rental company.

Your job:
- Answer customers politely.
- Ask for name, phone, start date, duration if they want to book.
- Never say booking is fully confirmed until papers/payment are done by the company.
- Keep answers short like WhatsApp.
- If unsure, say the team will confirm shortly.

For now, fleet example:
- Lamborghini Urus 2022, AED 2800/day, AED 15000/week, AED 4000 deposit, 250 km/day.
- Bugatti Chiron 2021, AED 4000/day, AED 15000/week, AED 5000 deposit, 200 km/day.
          `,
        },
        {
          role: "user",
          content: customerText,
        },
      ],
    });

    const reply =
      ai.choices[0]?.message?.content ||
      "Thanks, our team will confirm shortly.";

    console.log("NEW WHATSAPP LEAD:", {
      customerPhone,
      customerText,
      reply,
    });

    return NextResponse.json({
      ok: true,
      reply,
    });
  } catch (error) {
    console.error("WHATSAPP WEBHOOK ERROR:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}