import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// VERIFY WEBHOOK
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Verification failed", { status: 403 });
}

// RECEIVE MESSAGES
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const message =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const customerText = message.text?.body || "";
    const customerPhone = message.from;

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are RentAI, an AI assistant for luxury car rentals in Dubai. Help customers book cars, ask for dates, prices, and availability.",
        },
        {
          role: "user",
          content: customerText,
        },
      ],
    });

    const reply =
      ai.choices[0]?.message?.content ||
      "Thanks, our team will contact you shortly.";

    await fetch(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: customerPhone,
          text: {
            body: reply,
          },
        }),
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}
