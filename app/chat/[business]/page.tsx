"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

export default function CustomerChatPage() {
  const params = useParams();
  const business = params.business as string;

  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: string; content: string }[]
  >([]);

  async function sendMessage() {
    if (!message.trim()) return;

    const currentMessage = message;

    const updatedHistory = [
      ...chatHistory,
      {
        role: "user",
        content: currentMessage,
      },
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
      {
        role: "assistant",
        content: data.reply,
      },
    ]);
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.header}>
          <div>
            <p style={styles.badge}>AI Car Rental Assistant</p>
            <h1 style={styles.title}>Find your next rental car</h1>
            <p style={styles.subtitle}>
              Ask about availability, prices, deposits, mileage limits, and rental dates.
            </p>
          </div>
        </div>

        <div style={styles.chatBox}>
          {chatHistory.length === 0 && (
            <div style={styles.empty}>
              Ask something like:
              <br />
              <strong>“Do you have a Lamborghini Urus tomorrow?”</strong>
            </div>
          )}

          {chatHistory.map((msg, index) => (
            <div
              key={index}
              style={
                msg.role === "user"
                  ? styles.userBubble
                  : styles.aiBubble
              }
            >
              {msg.content}
            </div>
          ))}
        </div>

        <div style={styles.inputRow}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about a car..."
            style={styles.input}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />

          <button onClick={sendMessage} style={styles.button}>
            Send
          </button>
        </div>

        <p style={styles.footer}>
          Powered by AI. Final booking confirmation is handled by the rental company.
        </p>
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #1a1a1a 0%, #050505 45%, #000 100%)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: 24,
  },

  card: {
    width: "100%",
    maxWidth: 900,
    minHeight: 720,
    background: "rgba(10,10,10,0.95)",
    border: "1px solid #242424",
    borderRadius: 32,
    padding: 28,
    boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
  },

  header: {
    borderBottom: "1px solid #242424",
    paddingBottom: 22,
    marginBottom: 22,
  },

  badge: {
    color: "#34d399",
    fontWeight: 900,
    fontSize: 14,
    margin: 0,
    marginBottom: 8,
  },

  title: {
    fontSize: 42,
    margin: 0,
    letterSpacing: -1.5,
  },

  subtitle: {
    color: "#aaa",
    fontSize: 16,
    marginTop: 10,
    maxWidth: 650,
  },

  chatBox: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    overflowY: "auto",
    padding: "10px 4px",
  },

  empty: {
    margin: "auto",
    textAlign: "center",
    color: "#777",
    lineHeight: 1.7,
    fontSize: 17,
  },

  userBubble: {
    alignSelf: "flex-end",
    background: "white",
    color: "black",
    padding: "14px 16px",
    borderRadius: "18px 18px 4px 18px",
    maxWidth: "75%",
    fontWeight: 700,
    whiteSpace: "pre-wrap",
  },

  aiBubble: {
    alignSelf: "flex-start",
    background: "#151515",
    color: "white",
    border: "1px solid #303030",
    padding: "14px 16px",
    borderRadius: "18px 18px 18px 4px",
    maxWidth: "75%",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },

  inputRow: {
    display: "flex",
    gap: 12,
    borderTop: "1px solid #242424",
    paddingTop: 18,
    marginTop: 18,
  },

  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 110,
    background: "#050505",
    color: "white",
    border: "1px solid #303030",
    borderRadius: 16,
    padding: 14,
    resize: "none",
    outline: "none",
    fontSize: 15,
    fontFamily: "Arial",
  },

  button: {
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 16,
    padding: "0 24px",
    fontWeight: 900,
    cursor: "pointer",
  },

  footer: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
};