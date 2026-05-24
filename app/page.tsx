"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Car = {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  daily_price: number;
  weekly_price: number;
  deposit: number;
  mileage_limit: number;
  available: boolean;
  notes: string;
};

export default function Home() {
  const [cars, setCars] = useState<Car[]>([]);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const [form, setForm] = useState({
    name: "",
    brand: "",
    model: "",
    year: "",
    daily_price: "",
    weekly_price: "",
    deposit: "",
    mileage_limit: "",
    notes: "",
  });

  async function loadCars() {
    const { data } = await supabase
      .from("cars")
      .select("*")
      .order("created_at", { ascending: false });

    setCars(data || []);
  }

  async function addCar() {
    await supabase.from("cars").insert({
      name: form.name,
      brand: form.brand,
      model: form.model,
      year: Number(form.year),
      daily_price: Number(form.daily_price),
      weekly_price: Number(form.weekly_price),
      deposit: Number(form.deposit),
      mileage_limit: Number(form.mileage_limit),
      available: true,
      notes: form.notes,
    });

    setForm({
      name: "",
      brand: "",
      model: "",
      year: "",
      daily_price: "",
      weekly_price: "",
      deposit: "",
      mileage_limit: "",
      notes: "",
    });

    loadCars();
  }

  async function sendMessage() {
    setReply("Thinking...");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
      }),
    });

    const data = await res.json();

    setReply(data.reply);
  }

  useEffect(() => {
    loadCars();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-2">Car Rental AI</h1>

      <p className="text-gray-400 mb-10">
        AI receptionist for luxury car rentals.
      </p>

      <div className="bg-zinc-900 border border-zinc-700 rounded p-6 mb-10">
        <h2 className="text-2xl font-bold mb-4">AI Customer Chat</h2>

        <textarea
          className="w-full p-4 rounded bg-black border border-zinc-700 mb-4"
          rows={4}
          placeholder="Example: Do you have a G63 tomorrow under 2000 AED?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <button
          onClick={sendMessage}
          className="bg-white text-black px-6 py-3 rounded font-bold"
        >
          Ask AI
        </button>

        {reply && (
          <div className="mt-6 bg-black border border-zinc-700 p-4 rounded">
            <p className="text-gray-300 whitespace-pre-wrap">{reply}</p>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded p-6 mb-10">
        <h2 className="text-2xl font-bold mb-4">Add Rental Car</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(form).map((key) => (
            <input
              key={key}
              className="p-3 rounded bg-black border border-zinc-700"
              placeholder={key.replace("_", " ")}
              value={(form as any)[key]}
              onChange={(e) =>
                setForm({ ...form, [key]: e.target.value })
              }
            />
          ))}
        </div>

        <button
          onClick={addCar}
          className="mt-4 bg-white text-black px-6 py-3 rounded font-bold"
        >
          Add Car
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Fleet</h2>

        <div className="grid gap-4">
          {cars.map((car) => (
            <div
              key={car.id}
              className="bg-zinc-900 border border-zinc-700 rounded p-4"
            >
              <h3 className="text-xl font-bold">{car.name}</h3>

              <p>
                {car.brand} {car.model} — {car.year}
              </p>

              <p>
                AED {car.daily_price}/day · AED {car.weekly_price}/week
              </p>

              <p>Deposit: AED {car.deposit}</p>

              <p>Mileage: {car.mileage_limit} km/day</p>

              <p className="text-gray-400 mt-2">{car.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}