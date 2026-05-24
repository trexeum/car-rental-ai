"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tab = "fleet" | "chat" | "leads" | "rentals";

const emptyForm = {
  name: "",
  brand: "",
  model: "",
  year: "",
  daily_price: "",
  weekly_price: "",
  deposit: "",
  mileage_limit: "",
  image_url: "",
  notes: "",
};

export default function AdminDashboard() {
  const params = useParams();
  const business = params.business as string;

  const [tab, setTab] = useState<Tab>("fleet");
  const [cars, setCars] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: string; content: string }[]
  >([]);

  async function loadCars() {
    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .eq("business_id", business)
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Could not load cars: ${error.message}`);
      return;
    }

    setCars(data || []);
  }

  async function loadLeads() {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("business_id", business)
      .order("created_at", { ascending: false });

    setLeads(data || []);
  }

  async function saveCar() {
    if (!form.name || !form.brand || !form.model) {
      alert("Fill car name, brand, and model.");
      return;
    }

    setSaving(true);

    const payload = {
      business_id: business,
      name: form.name,
      brand: form.brand,
      model: form.model,
      year: Number(form.year),
      daily_price: Number(form.daily_price),
      weekly_price: Number(form.weekly_price),
      deposit: Number(form.deposit),
      mileage_limit: Number(form.mileage_limit),
      image_url: form.image_url,
      notes: form.notes,
    };

    const res = editingId
      ? await supabase.from("cars").update(payload).eq("id", editingId)
      : await supabase.from("cars").insert({
          ...payload,
          status: "available",
          available: true,
        });

    setSaving(false);

    if (res.error) {
      alert(`Car save failed: ${res.error.message}`);
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    await loadCars();
  }

  function editCar(car: any) {
    setEditingId(car.id);

    setForm({
      name: car.name || "",
      brand: car.brand || "",
      model: car.model || "",
      year: String(car.year || ""),
      daily_price: String(car.daily_price || ""),
      weekly_price: String(car.weekly_price || ""),
      deposit: String(car.deposit || ""),
      mileage_limit: String(car.mileage_limit || ""),
      image_url: car.image_url || "",
      notes: car.notes || "",
    });
  }

  async function deleteCar(car: any) {
    if (!confirm(`Delete ${car.name}?`)) return;

    await supabase.from("cars").delete().eq("id", car.id);
    await loadCars();
  }

  async function startRental(car: any) {
    const customerName = prompt("Customer name?");
    if (!customerName) return;

    const customerPhone = prompt("Customer phone?");
    if (!customerPhone) return;

    const startDate = prompt("Start date? Example: 2026-05-24");
    if (!startDate) return;

    const endDate = prompt("End date? Example: 2026-05-27");
    if (!endDate) return;

    await supabase
      .from("cars")
      .update({
        status: "booked",
        available: false,
        current_customer_name: customerName,
        current_customer_phone: customerPhone,
        rental_start_date: startDate,
        rental_end_date: endDate,
        available_from: endDate,
      })
      .eq("id", car.id);

    await loadCars();
  }

  async function endRental(car: any) {
    if (!confirm(`End rental for ${car.name}?`)) return;

    await supabase
      .from("cars")
      .update({
        status: "available",
        available: true,
        current_customer_name: "",
        current_customer_phone: "",
        rental_start_date: null,
        rental_end_date: null,
        available_from: null,
      })
      .eq("id", car.id);

    await loadCars();
  }

  async function askAI() {
    if (!message.trim()) return;

    const currentMessage = message;

    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: currentMessage },
    ];

    setChatHistory(updatedHistory);
    setMessage("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: currentMessage,
        business,
        history: chatHistory,
      }),
    });

    const data = await res.json();

    setChatHistory([
      ...updatedHistory,
      { role: "assistant", content: data.reply },
    ]);

    await loadLeads();
  }

  useEffect(() => {
    loadCars();
    loadLeads();
  }, []);

  const availableCars = cars.filter(
    (car) => (car.status || "available") === "available"
  ).length;

  const bookedCars = cars.filter((car) => car.status === "booked").length;

  const activeRentals = cars.filter((car) => car.status === "booked");

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <h1 style={styles.logo}>RentAI</h1>
          <p style={styles.muted}>AI fleet assistant</p>
        </div>

        <div style={styles.navBox}>
          <button
            onClick={() => setTab("fleet")}
            style={tab === "fleet" ? styles.activeNav : styles.nav}
          >
            Fleet
          </button>

          <button
            onClick={() => setTab("chat")}
            style={tab === "chat" ? styles.activeNav : styles.nav}
          >
            AI Chat
          </button>

          <button
            onClick={() => setTab("leads")}
            style={tab === "leads" ? styles.activeNav : styles.nav}
          >
            Leads
          </button>

          <button
            onClick={() => setTab("rentals")}
            style={tab === "rentals" ? styles.activeNav : styles.nav}
          >
            Rentals
          </button>
        </div>

        <div style={styles.businessBox}>
          <p style={styles.smallMuted}>Business</p>
          <strong>{business}</strong>
        </div>
      </aside>

      <section style={styles.main}>
        <header style={styles.header}>
          <p style={styles.smallMuted}>Business Dashboard</p>
          <h1 style={styles.title}>Fleet Command Center</h1>
          <p style={styles.subtitle}>
            Manage cars, AI leads, and active rentals.
          </p>
        </header>

        <section style={styles.stats}>
          <Stat label="Total Cars" value={cars.length} />
          <Stat label="Available" value={availableCars} />
          <Stat label="Booked" value={bookedCars} />
          <Stat label="AI Leads" value={leads.length} />
        </section>

        {tab === "fleet" && (
          <section style={styles.grid}>
            <div style={styles.card}>
              <h2>{editingId ? "Edit Vehicle" : "Add Vehicle"}</h2>
              <p style={styles.muted}>
                Paste an image URL for now. This is stable and won’t break.
              </p>

              <div style={styles.form}>
                <Input
                  placeholder="Car name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                />

                <Input
                  placeholder="Brand"
                  value={form.brand}
                  onChange={(v) => setForm({ ...form, brand: v })}
                />

                <Input
                  placeholder="Model"
                  value={form.model}
                  onChange={(v) => setForm({ ...form, model: v })}
                />

                <Input
                  placeholder="Year"
                  value={form.year}
                  onChange={(v) => setForm({ ...form, year: v })}
                />

                <Input
                  placeholder="Daily price AED"
                  value={form.daily_price}
                  onChange={(v) => setForm({ ...form, daily_price: v })}
                />

                <Input
                  placeholder="Weekly price AED"
                  value={form.weekly_price}
                  onChange={(v) => setForm({ ...form, weekly_price: v })}
                />

                <Input
                  placeholder="Deposit AED"
                  value={form.deposit}
                  onChange={(v) => setForm({ ...form, deposit: v })}
                />

                <Input
                  placeholder="Mileage limit"
                  value={form.mileage_limit}
                  onChange={(v) => setForm({ ...form, mileage_limit: v })}
                />

                <Input
                  placeholder="Image URL"
                  value={form.image_url}
                  onChange={(v) => setForm({ ...form, image_url: v })}
                />

                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    style={styles.preview}
                  />
                )}

                <textarea
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  style={styles.textarea}
                />

                <button
                  onClick={saveCar}
                  disabled={saving}
                  style={styles.whiteButtonFull}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Add Vehicle"}
                </button>

                {editingId && (
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm);
                    }}
                    style={styles.darkButtonFull}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div style={styles.card}>
              <h2>Fleet Inventory</h2>
              <p style={styles.muted}>{cars.length} vehicles connected to AI.</p>

              <div style={styles.list}>
                {cars.length === 0 && (
                  <div style={styles.empty}>No cars yet.</div>
                )}

                {cars.map((car) => (
                  <div key={car.id} style={styles.carCard}>
                    {car.image_url ? (
                      <img
                        src={car.image_url}
                        alt={car.name}
                        style={styles.carImage}
                      />
                    ) : (
                      <div style={styles.noImage}>No Image</div>
                    )}

                    <div style={styles.carBody}>
                      <div style={styles.row}>
                        <div>
                          <h2 style={styles.carTitle}>{car.name}</h2>
                          <p style={styles.muted}>
                            {car.brand} {car.model} · {car.year}
                          </p>
                        </div>

                        <span
                          style={
                            car.status === "booked"
                              ? styles.booked
                              : styles.available
                          }
                        >
                          {car.status || "available"}
                        </span>
                      </div>

                      <div style={styles.miniGrid}>
                        <Mini label="Daily" value={`AED ${car.daily_price}`} />
                        <Mini label="Weekly" value={`AED ${car.weekly_price}`} />
                        <Mini label="Deposit" value={`AED ${car.deposit}`} />
                        <Mini
                          label="Mileage"
                          value={`${car.mileage_limit} km/day`}
                        />
                      </div>

                      {car.notes && <div style={styles.info}>{car.notes}</div>}

                      <div style={styles.actions}>
                        {car.status === "booked" ? (
                          <button
                            onClick={() => endRental(car)}
                            style={styles.greenButton}
                          >
                            End Rental
                          </button>
                        ) : (
                          <button
                            onClick={() => startRental(car)}
                            style={styles.greenButton}
                          >
                            Start Rental
                          </button>
                        )}

                        <button
                          onClick={() => editCar(car)}
                          style={styles.editButton}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteCar(car)}
                          style={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "chat" && (
          <div style={styles.card}>
            <h2>AI Chat Test</h2>

            <div style={styles.chatMessages}>
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  style={
                    msg.role === "user" ? styles.userBubble : styles.aiBubble
                  }
                >
                  {msg.content}
                </div>
              ))}
            </div>

            <textarea
              placeholder="Ask the AI..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={styles.textarea}
            />

            <button onClick={askAI} style={styles.whiteButtonFull}>
              Ask AI
            </button>
          </div>
        )}

        {tab === "leads" && (
          <div style={styles.card}>
            <h2>Leads</h2>

            <div style={styles.list}>
              {leads.length === 0 && <div style={styles.empty}>No leads yet.</div>}

              {leads.map((lead) => (
                <div key={lead.id} style={styles.leadCard}>
                  <strong>{lead.car_requested || "Unknown car"}</strong>
                  <p>{lead.customer_message}</p>
                  <div style={styles.info}>{lead.ai_reply}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "rentals" && (
          <div style={styles.card}>
            <h2>Active Rentals</h2>

            <div style={styles.list}>
              {activeRentals.length === 0 && (
                <div style={styles.empty}>No active rentals.</div>
              )}

              {activeRentals.map((car) => (
                <div key={car.id} style={styles.leadCard}>
                  <h3>{car.name}</h3>

                  <div style={styles.info}>
                    Customer: {car.current_customer_name}
                    <br />
                    Phone: {car.current_customer_phone}
                    <br />
                    Start: {car.rental_start_date}
                    <br />
                    End: {car.rental_end_date}
                  </div>

                  <button
                    onClick={() => endRental(car)}
                    style={styles.greenButtonFull}
                  >
                    End Rental
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Input({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={styles.input}
    />
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.stat}>
      <span style={styles.smallMuted}>{label}</span>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.mini}>
      <span style={styles.smallMuted}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles: Record<string, any> = {
  page: {
    minHeight: "100vh",
    background: "#050505",
    color: "white",
    display: "flex",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  sidebar: {
    width: 270,
    padding: 30,
    borderRight: "1px solid #202020",
    background: "#080808",
    display: "flex",
    flexDirection: "column",
    gap: 28,
    minHeight: "100vh",
  },

  logo: {
    fontSize: 36,
    fontWeight: 900,
    margin: 0,
  },

  navBox: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  nav: {
    background: "transparent",
    color: "#aaa",
    border: "none",
    borderRadius: 14,
    padding: "14px 16px",
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "left",
  },

  activeNav: {
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 14,
    padding: "14px 16px",
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "left",
  },

  businessBox: {
    marginTop: "auto",
    background: "#111",
    border: "1px solid #252525",
    borderRadius: 18,
    padding: 18,
  },

  main: {
    flex: 1,
    padding: 38,
  },

  header: {
    marginBottom: 26,
  },

  title: {
    fontSize: 48,
    letterSpacing: -2,
    margin: "6px 0",
  },

  subtitle: {
    color: "#aaa",
    fontSize: 17,
    margin: 0,
  },

  muted: {
    color: "#9b9b9b",
    margin: 0,
  },

  smallMuted: {
    color: "#9b9b9b",
    fontSize: 14,
    margin: 0,
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  },

  stat: {
    background: "#111",
    border: "1px solid #252525",
    borderRadius: 24,
    padding: 22,
  },

  statValue: {
    display: "block",
    fontSize: 34,
    marginTop: 10,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "420px 1fr",
    gap: 24,
    alignItems: "start",
  },

  card: {
    background: "#111",
    border: "1px solid #252525",
    borderRadius: 28,
    padding: 26,
  },

  form: {
    display: "grid",
    gap: 13,
    marginTop: 18,
  },

  input: {
    width: "100%",
    background: "#050505",
    color: "white",
    border: "1px solid #303030",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    minHeight: 110,
    background: "#050505",
    color: "white",
    border: "1px solid #303030",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  },

  preview: {
    width: "100%",
    height: 180,
    objectFit: "cover",
    borderRadius: 16,
    border: "1px solid #303030",
  },

  whiteButtonFull: {
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 14,
    padding: 15,
    fontWeight: 900,
    cursor: "pointer",
    width: "100%",
  },

  darkButtonFull: {
    background: "#222",
    color: "white",
    border: "none",
    borderRadius: 14,
    padding: 15,
    fontWeight: 900,
    cursor: "pointer",
    width: "100%",
  },

  list: {
    display: "grid",
    gap: 16,
    marginTop: 18,
  },

  empty: {
    padding: 35,
    textAlign: "center",
    color: "#777",
    border: "1px dashed #333",
    borderRadius: 18,
  },

  carCard: {
    background: "#060606",
    border: "1px solid #303030",
    borderRadius: 24,
    overflow: "hidden",
  },

  carImage: {
    width: "100%",
    height: 230,
    objectFit: "cover",
    display: "block",
  },

  noImage: {
    height: 230,
    background: "#0b0b0b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    fontWeight: 900,
  },

  carBody: {
    padding: 22,
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
  },

  carTitle: {
    fontSize: 28,
    margin: 0,
  },

  available: {
    background: "rgba(16,185,129,0.15)",
    color: "#34d399",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 900,
    textTransform: "capitalize",
  },

  booked: {
    background: "rgba(251,191,36,0.15)",
    color: "#fbbf24",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 900,
    textTransform: "capitalize",
  },

  miniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    margin: "18px 0",
  },

  mini: {
    background: "#111",
    border: "1px solid #252525",
    borderRadius: 16,
    padding: 14,
  },

  info: {
    background: "#111",
    border: "1px solid #252525",
    borderRadius: 14,
    padding: 14,
    color: "#ddd",
    whiteSpace: "pre-wrap",
    marginTop: 12,
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  },

  greenButton: {
    background: "rgba(16,185,129,0.15)",
    color: "#34d399",
    border: "1px solid rgba(16,185,129,0.3)",
    borderRadius: 12,
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: 900,
  },

  greenButtonFull: {
    background: "rgba(16,185,129,0.15)",
    color: "#34d399",
    border: "1px solid rgba(16,185,129,0.3)",
    borderRadius: 12,
    padding: "13px 15px",
    cursor: "pointer",
    fontWeight: 900,
    width: "100%",
    marginTop: 14,
  },

  editButton: {
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 12,
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: 900,
  },

  deleteButton: {
    background: "rgba(255,0,0,0.12)",
    color: "#ff5b5b",
    border: "1px solid rgba(255,0,0,0.22)",
    borderRadius: 12,
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: 900,
  },

  chatMessages: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 18,
    maxHeight: 300,
    overflowY: "auto",
  },

  userBubble: {
    alignSelf: "flex-end",
    background: "white",
    color: "black",
    padding: 14,
    borderRadius: 16,
    maxWidth: "80%",
    fontWeight: 700,
  },

  aiBubble: {
    alignSelf: "flex-start",
    background: "#181818",
    border: "1px solid #303030",
    padding: 14,
    borderRadius: 16,
    maxWidth: "80%",
  },

  leadCard: {
    background: "#060606",
    border: "1px solid #303030",
    borderRadius: 18,
    padding: 18,
  },
};