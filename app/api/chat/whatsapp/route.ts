import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function sendWhatsAppMessage(to: string, message: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.log("Missing WhatsApp credentials");
    return;
  }

  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        body: message,
      },
    }),
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return NextResponse.json({ success: true });
    }

    const customerPhone = message.from;
    const customerText = message.text?.body || "";

    const business = "elite-rentals";

    const { data: cars } = await supabase
      .from("cars")
      .select("*")
      .eq("business_id", business);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
You are an AI WhatsApp sales assistant for a Dubai luxury car rental company.

Only answer using the inventory below.
Never invent cars, prices, images, or availability.
If a car is available, send price, deposit, mileage, and image URL if available.
If a car is booked, explain when it is available again.
Keep replies short and natural like WhatsApp.
Always try to collect name, phone number, rental duration, and start date.

Inventory:
${JSON.stringify(cars, null, 2)}
          `,
        },
        {
          role: "user",
          content: customerText,
        },
      ],
    });

    const aiReply = completion.choices[0].message.content || "Sorry, I could not reply.";

    await supabase.from("leads").insert({
      business_id: business,
      customer_message: customerText,
      ai_reply: aiReply,
      customer_phone: customerPhone,
      lead_status: "new",
    });

    await sendWhatsAppMessage(customerPhone, aiReply);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}