"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ClipboardEvent, CSSProperties, ReactNode } from "react";
import { useParams } from "next/navigation";

type Tab = "dashboard" | "fleet" | "rentals" | "leads" | "ai";
type CarStatus = "available" | "rented" | "maintenance";

type Car = {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: string;
  dailyPrice: string;
  weeklyPrice: string;
  deposit: string;
  mileage: string;
  imageData: string;
  imageUrl?: string;
  notes: string;
  status: CarStatus;
  customerName?: string;
  customerPhone?: string;
  rentalStart?: string;
  rentalEnd?: string;
};

type Lead = {
  id: string;
  customer: string;
  phone: string;
  request: string;
  status: "new" | "hot" | "closed";
  createdAt: string;
};

const emptyCar = {
  name: "",
  brand: "",
  model: "",
  year: "",
  dailyPrice: "",
  weeklyPrice: "",
  deposit: "",
  mileage: "",
  imageData: "",
  notes: "",
};

export default function AdminDashboard() {
  const params = useParams();
  const business = String(params.business || "demo");

  const storageKey = `rentai-cars-${business}`;
  const leadsKey = `rentai-leads-${business}`;

  const [tab, setTab] = useState<Tab>("dashboard");
  const [cars, setCars] = useState<Car[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState(emptyCar);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiReply, setAiReply] = useState("");

  useEffect(() => {
    const savedCars = localStorage.getItem(storageKey);
    const savedLeads = localStorage.getItem(leadsKey);

    const parsedCars: Car[] = savedCars ? JSON.parse(savedCars) : [];

    const upgradedCars = parsedCars.map((car) => ({
      ...car,
      imageData: car.imageData || car.imageUrl || "",
      status: car.status || "available",
    }));

    setCars(upgradedCars);
    setLeads(savedLeads ? JSON.parse(savedLeads) : []);
  }, [storageKey, leadsKey]);

  function saveCars(nextCars: Car[]) {
    setCars(nextCars);
    localStorage.setItem(storageKey, JSON.stringify(nextCars));
  }

  function saveLeads(nextLeads: Lead[]) {
    setLeads(nextLeads);
    localStorage.setItem(leadsKey, JSON.stringify(nextLeads));
  }

  function resetForm() {
    setForm(emptyCar);
    setEditingId(null);
  }

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  async function handleChooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageData = await fileToDataUrl(file);
    setForm((prev) => ({ ...prev, imageData }));
  }

  async function handlePasteImage(event: ClipboardEvent<HTMLDivElement>) {
    const items = event.clipboardData.items;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) return;

        const imageData = await fileToDataUrl(file);
        setForm((prev) => ({ ...prev, imageData }));
        return;
      }
    }

    alert("No image found. Copy an image first, then click the box and press CMD+V.");
  }

  function saveCar() {
    if (!form.name || !form.brand || !form.model) {
      alert("Add at least car name, brand, and model.");
      return;
    }

    const oldCar = cars.find((car) => car.id === editingId);

    const car: Car = {
      id: editingId || crypto.randomUUID(),
      ...form,
      status: oldCar?.status || "available",
      customerName: oldCar?.customerName || "",
      customerPhone: oldCar?.customerPhone || "",
      rentalStart: oldCar?.rentalStart || "",
      rentalEnd: oldCar?.rentalEnd || "",
    };

    const nextCars = editingId
      ? cars.map((c) => (c.id === editingId ? car : c))
      : [car, ...cars];

    saveCars(nextCars);
    resetForm();
  }

  function editCar(car: Car) {
    setEditingId(car.id);
    setForm({
      name: car.name,
      brand: car.brand,
      model: car.model,
      year: car.year,
      dailyPrice: car.dailyPrice,
      weeklyPrice: car.weeklyPrice,
      deposit: car.deposit,
      mileage: car.mileage,
      imageData: car.imageData || car.imageUrl || "",
      notes: car.notes,
    });
    setTab("fleet");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteCar(id: string) {
    if (!confirm("Delete this car?")) return;
    saveCars(cars.filter((car) => car.id !== id));
  }

  function startRental(car: Car) {
    const customerName = prompt("Customer name?");
    if (!customerName) return;

    const customerPhone = prompt("Customer phone?");
    if (!customerPhone) return;

    const rentalStart = prompt("Start date? Example: 2026-05-24");
    if (!rentalStart) return;

    const rentalEnd = prompt("End date? Example: 2026-05-27");
    if (!rentalEnd) return;

    saveCars(
      cars.map((c) =>
        c.id === car.id
          ? {
              ...c,
              status: "rented",
              customerName,
              customerPhone,
              rentalStart,
              rentalEnd,
            }
          : c
      )
    );
  }

  function endRental(car: Car) {
    if (!confirm(`Mark ${car.name} as returned?`)) return;

    saveCars(
      cars.map((c) =>
        c.id === car.id
          ? {
              ...c,
              status: "available",
              customerName: "",
              customerPhone: "",
              rentalStart: "",
              rentalEnd: "",
            }
          : c
      )
    );
  }

  function askAI() {
    if (!aiQuestion.trim()) return;

    const lowerQuestion = aiQuestion.toLowerCase();

    const matchedCar = cars.find(
      (car) =>
        lowerQuestion.includes(car.name.toLowerCase()) ||
        lowerQuestion.includes(car.model.toLowerCase()) ||
        lowerQuestion.includes(car.brand.toLowerCase())
    );

    const reply = matchedCar
      ? matchedCar.status === "available"
        ? `${matchedCar.name} is available. Daily price is AED ${matchedCar.dailyPrice}, weekly is AED ${matchedCar.weeklyPrice}, deposit is AED ${matchedCar.deposit}, mileage limit is ${matchedCar.mileage} km/day.`
        : `${matchedCar.name} is currently rented until ${matchedCar.rentalEnd || "the return date"}.`
      : "I can help with availability, prices, deposits, mileage, and rental dates. Please mention the car model you want.";

    setAiReply(reply);

    const newLead: Lead = {
      id: crypto.randomUUID(),
      customer: "AI Chat Lead",
      phone: "Not collected yet",
      request: aiQuestion,
      status: matchedCar ? "hot" : "new",
      createdAt: new Date().toLocaleString(),
    };

    saveLeads([newLead, ...leads]);
  }

  const filteredCars = cars.filter((car) =>
    `${car.name} ${car.brand} ${car.model}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = cars.length;
    const available = cars.filter((car) => car.status === "available").length;
    const rented = cars.filter((car) => car.status === "rented").length;
    const revenue = cars
      .filter((car) => car.status === "rented")
      .reduce((sum, car) => sum + Number(car.dailyPrice || 0), 0);

    return { total, available, rented, revenue };
  }, [cars]);

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brandMark}>R</div>
          <h1 style={styles.logo}>RentAI</h1>
          <p style={styles.sidebarText}>
            AI operating system for premium rental fleets.
          </p>
        </div>

        <nav style={styles.nav}>
          <NavButton label="Dashboard" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
          <NavButton label="Fleet" active={tab === "fleet"} onClick={() => setTab("fleet")} />
          <NavButton label="Rentals" active={tab === "rentals"} onClick={() => setTab("rentals")} />
          <NavButton label="Leads" active={tab === "leads"} onClick={() => setTab("leads")} />
          <NavButton label="AI Assistant" active={tab === "ai"} onClick={() => setTab("ai")} />
        </nav>

        <div style={styles.businessCard}>
          <p style={styles.mutedSmall}>Business workspace</p>
          <strong>{business}</strong>
          <p style={styles.mutedSmall}>Live admin preview</p>
        </div>
      </aside>

      <section style={styles.content}>
        <header style={styles.hero}>
          <div>
            <p style={styles.eyebrow}>Premium Admin Dashboard</p>
            <h1 style={styles.title}>Fleet Command Center</h1>
            <p style={styles.subtitle}>
              Manage vehicles, availability, customers, leads and AI conversations from one clean dashboard.
            </p>
          </div>

          <button style={styles.primaryButton} onClick={() => setTab("fleet")}>
            Add Vehicle
          </button>
        </header>

        <section style={styles.statGrid}>
          <StatCard label="Total Fleet" value={stats.total} helper="Cars connected to AI" />
          <StatCard label="Available" value={stats.available} helper="Ready to rent" />
          <StatCard label="Rented" value={stats.rented} helper="Active rentals" />
          <StatCard label="Daily Active Value" value={`AED ${stats.revenue}`} helper="From rented cars" />
        </section>

        {tab === "dashboard" && (
          <section style={styles.dashboardGrid}>
            <Panel title="Live Operations" subtitle="Snapshot of your business right now.">
              <div style={styles.timeline}>
                <TimelineItem title="AI lead capture" text={`${leads.length} leads collected in this workspace.`} />
                <TimelineItem title="Fleet readiness" text={`${stats.available} cars are available for customers.`} />
                <TimelineItem title="Rental tracker" text={`${stats.rented} cars are currently rented.`} />
              </div>
            </Panel>

            <Panel title="Top Fleet" subtitle="Your latest vehicles.">
              <div style={styles.compactList}>
                {cars.slice(0, 4).map((car) => (
                  <div key={car.id} style={styles.compactCar}>
                    <div style={styles.thumb}>
                      {car.imageData ? (
                        <img src={car.imageData} style={styles.thumbImg} alt={car.name} />
                      ) : (
                        "No image"
                      )}
                    </div>
                    <div>
                      <strong>{car.name}</strong>
                      <p style={styles.mutedSmall}>AED {car.dailyPrice}/day</p>
                    </div>
                    <span style={smallBadgeStyle(car.status || "available")}>
                      {car.status || "available"}
                    </span>
                  </div>
                ))}
                {cars.length === 0 && <Empty text="No cars yet. Add your first vehicle." />}
              </div>
            </Panel>
          </section>
        )}

        {tab === "fleet" && (
          <section style={styles.fleetGrid}>
            <Panel title={editingId ? "Edit Vehicle" : "Add Vehicle"} subtitle="Paste or upload a car image. No links needed.">
              <div style={styles.formGrid}>
                <Input placeholder="Car name e.g. Lamborghini Urus" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                <Input placeholder="Brand e.g. Lamborghini" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
                <Input placeholder="Model e.g. Urus" value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
                <Input placeholder="Year e.g. 2022" value={form.year} onChange={(v) => setForm({ ...form, year: v })} />
                <Input placeholder="Daily price AED" value={form.dailyPrice} onChange={(v) => setForm({ ...form, dailyPrice: v })} />
                <Input placeholder="Weekly price AED" value={form.weeklyPrice} onChange={(v) => setForm({ ...form, weeklyPrice: v })} />
                <Input placeholder="Deposit AED" value={form.deposit} onChange={(v) => setForm({ ...form, deposit: v })} />
                <Input placeholder="Mileage limit km/day" value={form.mileage} onChange={(v) => setForm({ ...form, mileage: v })} />

                <div
                  style={styles.pasteBox}
                  tabIndex={0}
                  onPaste={handlePasteImage}
                >
                  {form.imageData ? (
                    <img src={form.imageData} style={styles.previewImg} alt="Car preview" />
                  ) : (
                    <div style={styles.pasteInner}>
                      <strong>Paste car image here</strong>
                      <p style={styles.mutedSmall}>
                        Click this box, then press CMD+V. Or choose a file below.
                      </p>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleChooseImage}
                  style={styles.input}
                />

                {form.imageData && (
                  <button
                    style={styles.secondaryButtonFull}
                    onClick={() => setForm({ ...form, imageData: "" })}
                  >
                    Remove Image
                  </button>
                )}

                <textarea
                  placeholder="Notes: color, free delivery, minimum rental days..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={styles.textarea}
                />

                <button style={styles.primaryButtonFull} onClick={saveCar}>
                  {editingId ? "Save Changes" : "Add Vehicle"}
                </button>

                {editingId && (
                  <button style={styles.secondaryButtonFull} onClick={resetForm}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </Panel>

            <Panel title="Fleet Inventory" subtitle="Search, edit, rent, or delete cars.">
              <input
                placeholder="Search fleet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.search}
              />

              <div style={styles.carGrid}>
                {filteredCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onEdit={() => editCar(car)}
                    onDelete={() => deleteCar(car.id)}
                    onStartRental={() => startRental(car)}
                    onEndRental={() => endRental(car)}
                  />
                ))}

                {filteredCars.length === 0 && <Empty text="No cars found." />}
              </div>
            </Panel>
          </section>
        )}

        {tab === "rentals" && (
          <Panel title="Rental Tracker" subtitle="Track rented cars and returns.">
            <div style={styles.carGrid}>
              {cars
                .filter((car) => car.status === "rented")
                .map((car) => (
                  <div key={car.id} style={styles.rentalCard}>
                    <h3>{car.name}</h3>
                    <p style={styles.muted}>Customer: {car.customerName}</p>
                    <p style={styles.muted}>Phone: {car.customerPhone}</p>
                    <p style={styles.muted}>Start: {car.rentalStart}</p>
                    <p style={styles.muted}>End: {car.rentalEnd}</p>
                    <button style={styles.primaryButtonFull} onClick={() => endRental(car)}>
                      Mark Returned
                    </button>
                  </div>
                ))}

              {stats.rented === 0 && <Empty text="No active rentals." />}
            </div>
          </Panel>
        )}

        {tab === "leads" && (
          <Panel title="AI Leads Inbox" subtitle="Every customer conversation can become a lead.">
            <div style={styles.leadList}>
              {leads.length === 0 && <Empty text="No leads yet." />}

              {leads.map((lead) => (
                <div key={lead.id} style={styles.leadCard}>
                  <div>
                    <strong>{lead.customer}</strong>
                    <p style={styles.muted}>{lead.request}</p>
                    <p style={styles.mutedSmall}>
                      {lead.phone} • {lead.createdAt}
                    </p>
                  </div>
                  <span style={lead.status === "hot" ? styles.hotBadge : styles.newBadge}>
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {tab === "ai" && (
          <Panel title="AI Assistant Test" subtitle="Simulate what your WhatsApp AI will answer.">
            <textarea
              placeholder="Example: Do you have a Lamborghini Urus for 3 days?"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              style={styles.aiBox}
            />
            <button style={styles.primaryButtonFull} onClick={askAI}>
              Ask AI
            </button>

            {aiReply && (
              <div style={styles.aiReply}>
                <p style={styles.mutedSmall}>AI reply</p>
                <strong>{aiReply}</strong>
              </div>
            )}
          </Panel>
        )}
      </section>
    </main>
  );
}

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button style={active ? styles.navActive : styles.navButton} onClick={onClick}>
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div style={styles.statCard}>
      <p style={styles.mutedSmall}>{label}</p>
      <h2 style={styles.statValue}>{value}</h2>
      <p style={styles.mutedSmall}>{helper}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>{title}</h2>
          <p style={styles.muted}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
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

function Empty({ text }: { text: string }) {
  return <div style={styles.empty}>{text}</div>;
}

function TimelineItem({ title, text }: { title: string; text: string }) {
  return (
    <div style={styles.timelineItem}>
      <div style={styles.dot} />
      <div>
        <strong>{title}</strong>
        <p style={styles.muted}>{text}</p>
      </div>
    </div>
  );
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
  const status = car.status || "available";

  return (
    <article style={styles.carCard}>
      <div style={styles.carImageWrap}>
        {car.imageData ? (
          <img src={car.imageData} style={styles.carImage} alt={car.name} />
        ) : (
          <div style={styles.noImage}>No Image</div>
        )}

        <span style={badgeStyle(status)}>{status}</span>
      </div>

      <div style={styles.carBody}>
        <h2 style={styles.carName}>{car.name}</h2>
        <p style={styles.muted}>
          {car.brand} {car.model} • {car.year}
        </p>

        <div style={styles.priceGrid}>
          <Mini label="Daily" value={`AED ${car.dailyPrice}`} />
          <Mini label="Weekly" value={`AED ${car.weeklyPrice}`} />
          <Mini label="Deposit" value={`AED ${car.deposit}`} />
          <Mini label="Mileage" value={`${car.mileage} km/day`} />
        </div>

        {car.notes && <p style={styles.note}>{car.notes}</p>}

        <div style={styles.actions}>
          {status === "rented" ? (
            <button style={styles.greenButton} onClick={onEndRental}>
              End Rental
            </button>
          ) : (
            <button style={styles.greenButton} onClick={onStartRental}>
              Start Rental
            </button>
          )}
          <button style={styles.editButton} onClick={onEdit}>
            Edit
          </button>
          <button style={styles.deleteButton} onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.mini}>
      <p style={styles.mutedSmall}>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function badgeStyle(status: CarStatus) {
  if (status === "rented") return styles.rentedBadge;
  if (status === "maintenance") return styles.maintenanceBadge;
  return styles.availableBadge;
}

function smallBadgeStyle(status: CarStatus) {
  if (status === "rented") return styles.smallRentedBadge;
  if (status === "maintenance") return styles.smallMaintenanceBadge;
  return styles.smallAvailableBadge;
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    background:
      "radial-gradient(circle at top left, rgba(255,255,255,0.09), transparent 32%), #050505",
    color: "white",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial",
  },
  sidebar: {
    width: 290,
    minHeight: "100vh",
    padding: 28,
    background: "rgba(8,8,8,0.92)",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: "linear-gradient(135deg,#fff,#777)",
    color: "#000",
    display: "grid",
    placeItems: "center",
    fontWeight: 1000,
    fontSize: 22,
    marginBottom: 14,
  },
  logo: { margin: 0, fontSize: 34, letterSpacing: -1.2 },
  sidebarText: { color: "#9ca3af", lineHeight: 1.5, marginTop: 8 },
  nav: { display: "grid", gap: 10 },
  navButton: {
    background: "transparent",
    color: "#a3a3a3",
    border: "1px solid transparent",
    borderRadius: 16,
    padding: "14px 16px",
    textAlign: "left",
    fontWeight: 850,
    cursor: "pointer",
  },
  navActive: {
    background: "#fff",
    color: "#000",
    border: "1px solid #fff",
    borderRadius: 16,
    padding: "14px 16px",
    textAlign: "left",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 18px 50px rgba(255,255,255,0.12)",
  },
  businessCard: {
    marginTop: "auto",
    padding: 18,
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 22,
  },
  content: { flex: 1, padding: 38 },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 22,
    marginBottom: 26,
  },
  eyebrow: {
    color: "#a3a3a3",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: 900,
    margin: 0,
  },
  title: {
    fontSize: 58,
    lineHeight: 1,
    letterSpacing: -3,
    margin: "10px 0",
  },
  subtitle: {
    color: "#a3a3a3",
    maxWidth: 720,
    fontSize: 17,
    lineHeight: 1.6,
    margin: 0,
  },
  primaryButton: {
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: 18,
    padding: "16px 22px",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 20px 60px rgba(255,255,255,0.14)",
  },
  primaryButtonFull: {
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: 16,
    padding: 15,
    fontWeight: 950,
    cursor: "pointer",
    width: "100%",
  },
  secondaryButtonFull: {
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 15,
    fontWeight: 900,
    cursor: "pointer",
    width: "100%",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background:
      "linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 26,
    padding: 22,
  },
  statValue: { fontSize: 36, margin: "8px 0" },
  muted: { color: "#9ca3af", margin: 0 },
  mutedSmall: { color: "#9ca3af", fontSize: 13, margin: 0 },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 22,
  },
  fleetGrid: {
    display: "grid",
    gridTemplateColumns: "430px 1fr",
    gap: 22,
    alignItems: "start",
  },
  panel: {
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 30,
    padding: 26,
    boxShadow: "0 30px 100px rgba(0,0,0,0.25)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  panelTitle: { fontSize: 29, margin: 0, letterSpacing: -0.8 },
  formGrid: { display: "grid", gap: 13 },
  input: {
    width: "100%",
    background: "#050505",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 15,
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  },
  pasteBox: {
    minHeight: 220,
    background: "#050505",
    border: "1px dashed rgba(255,255,255,0.25)",
    borderRadius: 20,
    overflow: "hidden",
    cursor: "copy",
    display: "grid",
    placeItems: "center",
    outline: "none",
  },
  pasteInner: {
    textAlign: "center",
    padding: 24,
  },
  search: {
    width: "100%",
    background: "#050505",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
    outline: "none",
    fontSize: 15,
    boxSizing: "border-box",
    marginBottom: 18,
  },
  textarea: {
    width: "100%",
    minHeight: 95,
    background: "#050505",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 15,
    outline: "none",
    fontSize: 14,
    resize: "vertical",
    boxSizing: "border-box",
  },
  aiBox: {
    width: "100%",
    minHeight: 170,
    background: "#050505",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 18,
    outline: "none",
    fontSize: 15,
    resize: "vertical",
    boxSizing: "border-box",
    marginBottom: 14,
  },
  previewImg: {
    width: "100%",
    height: "100%",
    minHeight: 220,
    objectFit: "cover",
    display: "block",
  },
  carGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))",
    gap: 18,
  },
  carCard: {
    background: "rgba(0,0,0,0.45)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 26,
    overflow: "hidden",
  },
  carImageWrap: { position: "relative", height: 230, background: "#0b0b0b" },
  carImage: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  noImage: {
    height: "100%",
    display: "grid",
    placeItems: "center",
    color: "#555",
    fontWeight: 900,
  },
  carBody: { padding: 20 },
  carName: { margin: 0, fontSize: 26, letterSpacing: -0.6 },
  priceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 16,
  },
  mini: {
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 13,
  },
  note: {
    color: "#d4d4d4",
    background: "rgba(255,255,255,0.045)",
    borderRadius: 16,
    padding: 13,
    marginTop: 14,
    lineHeight: 1.5,
  },
  actions: { display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" },
  greenButton: {
    background: "rgba(16,185,129,0.14)",
    color: "#34d399",
    border: "1px solid rgba(16,185,129,0.25)",
    borderRadius: 14,
    padding: "11px 13px",
    fontWeight: 900,
    cursor: "pointer",
  },
  editButton: {
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: 14,
    padding: "11px 13px",
    fontWeight: 900,
    cursor: "pointer",
  },
  deleteButton: {
    background: "rgba(239,68,68,0.12)",
    color: "#f87171",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 14,
    padding: "11px 13px",
    fontWeight: 900,
    cursor: "pointer",
  },
  availableBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    background: "rgba(16,185,129,0.92)",
    color: "#001b10",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    textTransform: "capitalize",
  },
  rentedBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    background: "rgba(251,191,36,0.95)",
    color: "#1f1300",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    textTransform: "capitalize",
  },
  maintenanceBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    background: "rgba(248,113,113,0.95)",
    color: "#1f0000",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    textTransform: "capitalize",
  },
  smallAvailableBadge: {
    background: "rgba(16,185,129,0.18)",
    color: "#34d399",
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    textTransform: "capitalize",
  },
  smallRentedBadge: {
    background: "rgba(251,191,36,0.18)",
    color: "#fbbf24",
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    textTransform: "capitalize",
  },
  smallMaintenanceBadge: {
    background: "rgba(248,113,113,0.18)",
    color: "#f87171",
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    textTransform: "capitalize",
  },
  empty: {
    border: "1px dashed rgba(255,255,255,0.15)",
    borderRadius: 22,
    padding: 35,
    color: "#777",
    textAlign: "center",
  },
  leadList: { display: "grid", gap: 14 },
  leadCard: {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
  },
  hotBadge: {
    height: "fit-content",
    background: "rgba(251,191,36,0.18)",
    color: "#fbbf24",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
  },
  newBadge: {
    height: "fit-content",
    background: "rgba(96,165,250,0.18)",
    color: "#60a5fa",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
  },
  rentalCard: {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 20,
  },
  compactList: { display: "grid", gap: 12 },
  compactCar: {
    display: "grid",
    gridTemplateColumns: "70px 1fr auto",
    alignItems: "center",
    gap: 14,
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 12,
  },
  thumb: {
    width: 70,
    height: 54,
    borderRadius: 14,
    overflow: "hidden",
    background: "#111",
    color: "#555",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  timeline: { display: "grid", gap: 18 },
  timelineItem: { display: "flex", gap: 14, alignItems: "flex-start" },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    background: "#fff",
    marginTop: 5,
    boxShadow: "0 0 30px rgba(255,255,255,0.8)",
  },
  aiReply: {
    marginTop: 18,
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 20,
    padding: 18,
    lineHeight: 1.6,
  },
};