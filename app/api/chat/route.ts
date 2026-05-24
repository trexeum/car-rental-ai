import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractPhone(text: string) {
  const match = text.match(/(\+?\d[\d\s-]{7,})/);
  return match ? match[0] : "";
}

function extractRentalDays(text: string) {
  const match = text.match(/(\d+)\s*(day|days)/i);
  return match ? Number(match[1]) : null;
}

export async function POST(req: Request) {
  try {
    const { message, business, history = [] } = await req.json();

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
You are an AI sales assistant for a Dubai luxury car rental company.

You are in an ongoing conversation. Do not restart every message.
Remember what the customer already said in the previous messages.

Rules:
- ONLY use cars from inventory.
- Never invent prices, cars, photos, or availability.
- If customer already gave phone/name/duration/date, do not ask again.
- If booked, say when available again.
- Keep replies short like WhatsApp.
- Ask only for missing info: name, phone number, rental duration, start date.
- Prices are in AED.

Inventory:
${JSON.stringify(cars, null, 2)}
          `,
        },
        ...history,
        {
          role: "user",
          content: message,
        },
      ],
    });

    const aiReply = completion.choices[0].message.content || "No reply.";

    const fullConversationText = [
      ...history.map((m: any) => m.content),
      message,
    ].join(" ");

    const lowerText = fullConversationText.toLowerCase();

    let requestedCar = "";

    const matchedCar = cars?.find((car: any) => {
      return (
        lowerText.includes(car.name?.toLowerCase()) ||
        lowerText.includes(car.brand?.toLowerCase()) ||
        lowerText.includes(car.model?.toLowerCase())
      );
    });

    if (matchedCar) {
      requestedCar = matchedCar.name;
    }

    const phone = extractPhone(fullConversationText);
    const rentalDays = extractRentalDays(fullConversationText);

    await supabase.from("leads").insert({
      business_id: business,
      customer_message: fullConversationText,
      ai_reply: aiReply,
      car_requested: requestedCar,
      lead_status: "new",
      customer_phone: phone,
      rental_days: rentalDays,
    });

    return NextResponse.json({
      reply: aiReply,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { reply: "Something went wrong." },
      { status: 500 }
    );
  }
}
