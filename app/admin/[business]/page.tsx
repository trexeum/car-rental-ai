"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tab = "overview" | "fleet" | "chat" | "leads" | "rentals";

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
  image_url?: string;
  status?: string;
  available_from?: string;
  current_customer_name?: string;
  current_customer_phone?: string;
  rental_start_date?: string;
  rental_end_date?: string;
};

type Lead = {
  id: string;
  customer_message: string;
  ai_reply: string;
  car_requested: string;
  lead_status: string;
};

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
  status: "available",
  available_from: "",
  current_customer_name: "",
  current_customer_phone: "",
  rental_start_date: "",
  rental_end_date: "",
  notes: "",
};

export default function AdminDashboard() {
  const params = useParams();
  const business = params.business as string;

  const [tab, setTab] = useState<Tab>("overview");
  const [cars, setCars] = useState<Car[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  async function loadCars() {
    const { data } = await supabase
      .from("cars")
      .select("*")
      .eq("business_id", business)
      .order("created_at", { ascending: false });

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
      alert("Please fill name, brand, and model.");
      return;
    }

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
      status: form.status,
      available: form.status === "available",
      available_from: form.available_from || null,
      current_customer_name: form.current_customer_name,
      current_customer_phone: form.current_customer_phone,
      rental_start_date: form.rental_start_date || null,
      rental_end_date: form.rental_end_date || null,
      notes: form.notes,
    };

    if (editingId) {
      await supabase.from("cars").update(payload).eq("id", editingId);
    } else {
      await supabase.from("cars").insert(payload);
    }

    setForm(emptyForm);
    setEditingId(null);
    await loadCars();
  }

  function startEdit(car: Car) {
    setEditingId(car.id);
    setTab("fleet");

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
      status: car.status || "available",
      available_from: car.available_from || "",
      current_customer_name: car.current_customer_name || "",
      current_customer_phone: car.current_customer_phone || "",
      rental_start_date: car.rental_start_date || "",
      rental_end_date: car.rental_end_date || "",
      notes: car.notes || "",
    });
  }

  async function deleteCar(id: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    await supabase.from("cars").delete().eq("id", id);
    await loadCars();
  }

  async function startRental(car: Car) {
    const customerName = prompt("Customer name?");
    if (!customerName) return;

    const customerPhone = prompt("Customer phone?");
    if (!customerPhone) return;

    const startDate = prompt("Rental start date? Example: 2026-05-24");
    if (!startDate) return;

    const endDate = prompt("Rental end date? Example: 2026-05-27");
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

  async function endRental(car: Car) {
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

    setReply("Thinking...");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, business }),
    });

    const data = await res.json();
    setReply(data.reply);
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

        <div style={styles.nav}>
          <NavButton label="Overview" active={tab === "overview"} onClick={() => setTab("overview")} />
          <NavButton label="Fleet" active={tab === "fleet"} onClick={() => setTab("fleet")} />
          <NavButton label="AI Chat" active={tab === "chat"} onClick={() => setTab("chat")} />
          <NavButton label="Leads" active={tab === "leads"} onClick={() => setTab("leads")} />
          <NavButton label="Rentals" active={tab === "rentals"} onClick={() => setTab("rentals")} />
        </div>

        <div style={styles.businessBox}>
          <p style={styles.smallMuted}>Business</p>
          <strong>{business}</strong>
        </div>
      </aside>

      <section style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.smallMuted}>Business Dashboard</p>
            <h1 style={styles.title}>Fleet Command Center</h1>
            <p style={styles.subtitle}>
              Manage cars, AI replies, leads, and active rentals from one dashboard.
            </p>
          </div>

          <a href={`/chat/${business}`} style={styles.whiteButton}>
            Customer Chat Page
          </a>
        </header>

        <section style={styles.stats}>
          <Stat label="Total Cars" value={cars.length} />
          <Stat label="Available" value={availableCars} />
          <Stat label="Booked" value={bookedCars} />
          <Stat label="AI Leads" value={leads.length} />
        </section>

        {tab === "overview" && (
          <section style={styles.grid2}>
            <Panel title="Quick AI Test" subtitle="Ask the AI like a customer would.">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Do you have a Lamborghini Urus tomorrow?"
                style={{ ...styles.input, minHeight: 140 }}
              />
              <button type="button" onClick={askAI} style={styles.whiteButtonFull}>
                Ask AI
              </button>
              {reply && <div style={styles.reply}>{reply}</div>}
            </Panel>

            <Panel title="Active Rentals" subtitle="Cars currently rented out.">
              <div style={styles.list}>
                {activeRentals.slice(0, 5).map((car) => (
                  <RentalCard key={car.id} car={car} onEndRental={() => endRental(car)} />
                ))}
                {activeRentals.length === 0 && <Empty text="No active rentals." />}
              </div>
            </Panel>
          </section>
        )}

        {tab === "fleet" && (
          <section style={styles.grid2}>
            <Panel
              title={editingId ? "Edit Vehicle" : "Add Vehicle"}
              subtitle={editingId ? "Update vehicle details." : "Add a car the AI can sell."}
            >
              <div style={styles.form}>
                <Field label="Car name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                <Field label="Brand" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
                <Field label="Model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
                <Field label="Year" value={form.year} onChange={(v) => setForm({ ...form, year: v })} />
                <Field label="Daily price AED" value={form.daily_price} onChange={(v) => setForm({ ...form, daily_price: v })} />
                <Field label="Weekly price AED" value={form.weekly_price} onChange={(v) => setForm({ ...form, weekly_price: v })} />
                <Field label="Deposit AED" value={form.deposit} onChange={(v) => setForm({ ...form, deposit: v })} />
                <Field label="Mileage limit" value={form.mileage_limit} onChange={(v) => setForm({ ...form, mileage_limit: v })} />
                <Field label="Image URL" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />

                <label style={styles.field}>
                  <span style={styles.label}>Status</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={styles.input}
                  >
                    <option value="available">Available</option>
                    <option value="booked">Booked</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </label>

                <Field label="Available from" value={form.available_from} onChange={(v) => setForm({ ...form, available_from: v })} />
                <Field label="Customer name" value={form.current_customer_name} onChange={(v) => setForm({ ...form, current_customer_name: v })} />
                <Field label="Customer phone" value={form.current_customer_phone} onChange={(v) => setForm({ ...form, current_customer_phone: v })} />
                <Field label="Rental start date" value={form.rental_start_date} onChange={(v) => setForm({ ...form, rental_start_date: v })} />
                <Field label="Rental end date" value={form.rental_end_date} onChange={(v) => setForm({ ...form, rental_end_date: v })} />

                <label style={styles.field}>
                  <span style={styles.label}>Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Black exterior, free delivery, minimum 2 days..."
                    style={{ ...styles.input, minHeight: 90 }}
                  />
                </label>
              </div>

              <button type="button" onClick={saveCar} style={styles.whiteButtonFull}>
                {editingId ? "Save Changes" : "Add Vehicle"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                  style={styles.darkButtonFull}
                >
                  Cancel Edit
                </button>
              )}
            </Panel>

            <Panel title="Fleet Inventory" subtitle={`${cars.length} vehicles connected to AI.`}>
              <div style={styles.list}>
                {cars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onEdit={() => startEdit(car)}
                    onDelete={() => deleteCar(car.id, car.name)}
                    onStartRental={() => startRental(car)}
                    onEndRental={() => endRental(car)}
                  />
                ))}
                {cars.length === 0 && <Empty text="No cars yet. Add your first vehicle." />}
              </div>
            </Panel>
          </section>
        )}

        {tab === "chat" && (
          <Panel title="AI Chat Test" subtitle="Test customer questions using this business fleet.">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Do you have a G63 tomorrow under AED 2000?"
              style={{ ...styles.input, minHeight: 180 }}
            />
            <button type="button" onClick={askAI} style={styles.whiteButtonFull}>
              Ask AI
            </button>
            {reply && <div style={styles.reply}>{reply}</div>}
          </Panel>
        )}

        {tab === "leads" && (
          <Panel title="AI Leads Inbox" subtitle="Every AI customer conversation is logged here.">
            <div style={styles.list}>
              {leads.map((lead) => (
                <div key={lead.id} style={styles.leadCard}>
                  <div style={styles.carTop}>
                    <strong>{lead.car_requested || "Unknown car"}</strong>
                    <span style={styles.leadStatus}>{lead.lead_status || "new"}</span>
                  </div>
                  <p style={styles.normalText}>{lead.customer_message}</p>
                  <div style={styles.infoBox}>{lead.ai_reply}</div>
                </div>
              ))}
              {leads.length === 0 && <Empty text="No leads yet." />}
            </div>
          </Panel>
        )}

        {tab === "rentals" && (
          <Panel title="Rental Tracker" subtitle="Track cars currently rented and when they return.">
            <div style={styles.list}>
              {activeRentals.map((car) => (
                <RentalCard key={car.id} car={car} onEndRental={() => endRental(car)} />
              ))}
              {activeRentals.length === 0 && <Empty text="No active rentals." />}
            </div>
          </Panel>
        )}
      </section>
    </main>
  );
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={active ? styles.navActive : styles.navButton}>
      {label}
    </button>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={styles.panel}>
      <h2 style={styles.panelTitle}>{title}</h2>
      <p style={styles.muted}>{subtitle}</p>
      <div style={{ marginTop: 18 }}>{children}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={styles.input} />
    </label>
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

function Empty({ text }: { text: string }) {
  return <div style={styles.empty}>{text}</div>;
}

function CarCard({
  car,
  onEdit,
  onDelete,
  onStartRental,
  onEndRental,
}: {
  car: Car;
  onEdit: () => void;
  onDelete: () => void;
  onStartRental: () => void;
  onEndRental: () => void;
}) {
  return (
    <div style={styles.carCard}>
      {car.image_url ? (
        <img src={car.image_url} alt={car.name} style={styles.carImage} />
      ) : (
        <div style={styles.noImage}>No Image</div>
      )}

      <div style={styles.carBody}>
        <div style={styles.carTop}>
          <div>
            <h3 style={styles.carTitle}>{car.name}</h3>
            <p style={styles.muted}>
              {car.brand} {car.model} · {car.year}
            </p>
          </div>
          <span style={getStatusStyle(car.status || "available")}>
            {car.status || "available"}
          </span>
        </div>

        <div style={styles.miniGrid}>
          <Mini label="Daily" value={`AED ${car.daily_price}`} />
          <Mini label="Weekly" value={`AED ${car.weekly_price}`} />
          <Mini label="Deposit" value={`AED ${car.deposit}`} />
          <Mini label="Mileage" value={`${car.mileage_limit} km/day`} />
        </div>

        {(car.rental_end_date || car.current_customer_name || car.current_customer_phone) && (
          <div style={styles.infoBox}>
            {car.current_customer_name && <p>Customer: {car.current_customer_name}</p>}
            {car.current_customer_phone && <p>Phone: {car.current_customer_phone}</p>}
            {car.rental_start_date && <p>Rental start: {car.rental_start_date}</p>}
            {car.rental_end_date && <p>Rental end: {car.rental_end_date}</p>}
            {car.rental_end_date && <p>Time left: {getDaysLeft(car.rental_end_date)}</p>}
          </div>
        )}

        {car.notes && <div style={styles.infoBox}>{car.notes}</div>}

        <div style={styles.actions}>
          {car.status === "booked" ? (
            <button type="button" onClick={onEndRental} style={styles.greenButton}>
              End Rental
            </button>
          ) : (
            <button type="button" onClick={onStartRental} style={styles.greenButton}>
              Start Rental
            </button>
          )}

          <button type="button" onClick={onEdit} style={styles.editButton}>
            Edit
          </button>

          <button type="button" onClick={onDelete} style={styles.deleteButton}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function RentalCard({ car, onEndRental }: { car: Car; onEndRental: () => void }) {
  return (
    <div style={styles.leadCard}>
      <div style={styles.carTop}>
        <div>
          <h3 style={{ margin: 0 }}>{car.name}</h3>
          <p style={styles.muted}>
            {car.brand} {car.model}
          </p>
        </div>
        <span style={getStatusStyle("booked")}>Booked</span>
      </div>

      <div style={styles.infoBox}>
        <p>Customer: {car.current_customer_name || "Not added"}</p>
        <p>Phone: {car.current_customer_phone || "Not added"}</p>
        <p>Start date: {car.rental_start_date || "Not added"}</p>
        <p>End date: {car.rental_end_date || "Not added"}</p>
        <p>Countdown: {car.rental_end_date ? getDaysLeft(car.rental_end_date) : "No end date"}</p>
      </div>

      <button type="button" onClick={onEndRental} style={styles.greenButtonFull}>
        Mark Returned / End Rental
      </button>
    </div>
  );
}

function getDaysLeft(endDate: string) {
  const today = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return "Overdue";
  if (days === 0) return "Returns today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function getStatusStyle(status: string) {
  if (status === "booked") {
    return { ...styles.status, background: "rgba(251,191,36,0.12)", color: "#fbbf24" };
  }

  if (status === "maintenance") {
    return { ...styles.status, background: "rgba(248,113,113,0.12)", color: "#f87171" };
  }

  return { ...styles.status, background: "rgba(16,185,129,0.12)", color: "#34d399" };
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
    gap: 35,
    minHeight: "100vh",
  },
  logo: { fontSize: 34, fontWeight: 900, margin: 0 },
  muted: { color: "#9b9b9b", margin: 0 },
  smallMuted: { color: "#9b9b9b", fontSize: 14, margin: 0 },
  nav: { display: "flex", flexDirection: "column", gap: 10 },
  navButton: {
    background: "transparent",
    color: "#aaa",
    border: "none",
    borderRadius: 14,
    padding: "14px 16px",
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "left",
  },
  navActive: {
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
  main: { flex: 1, padding: 38 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 28,
  },
  title: { fontSize: 48, letterSpacing: -2, margin: "6px 0" },
  subtitle: { color: "#aaa", fontSize: 17, margin: 0 },
  whiteButton: {
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 14,
    padding: "14px 20px",
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
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
    marginTop: 16,
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
    marginTop: 10,
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
  statValue: { display: "block", fontSize: 34, marginTop: 10 },
  grid2: {
    display: "grid",
    gridTemplateColumns: "420px 1fr",
    gap: 24,
    alignItems: "start",
  },
  panel: {
    background: "#111",
    border: "1px solid #252525",
    borderRadius: 28,
    padding: 26,
  },
  panelTitle: { fontSize: 28, margin: 0 },
  form: { display: "grid", gap: 13 },
  field: { display: "grid", gap: 7 },
  label: { color: "#aaa", fontSize: 13, fontWeight: 900 },
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
  reply: {
    marginTop: 16,
    background: "#050505",
    border: "1px solid #303030",
    borderRadius: 14,
    padding: 14,
    color: "#ddd",
    whiteSpace: "pre-wrap",
  },
  list: { display: "grid", gap: 16 },
  carCard: {
    background: "#060606",
    border: "1px solid #303030",
    borderRadius: 24,
    overflow: "hidden",
  },
  carImage: { width: "100%", height: 220, objectFit: "cover", display: "block" },
  noImage: {
    height: 220,
    background: "#0b0b0b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    fontWeight: 900,
  },
  carBody: { padding: 22 },
  carTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  },
  carTitle: { fontSize: 28, margin: 0 },
  status: {
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
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
  infoBox: {
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
  leadCard: {
    background: "#060606",
    border: "1px solid #303030",
    borderRadius: 18,
    padding: 18,
  },
  leadStatus: {
    color: "#34d399",
    background: "rgba(16,185,129,0.12)",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
  },
  normalText: { color: "white", margin: "12px 0" },
  empty: {
    padding: 35,
    textAlign: "center",
    color: "#777",
    border: "1px dashed #333",
    borderRadius: 18,
  },
};