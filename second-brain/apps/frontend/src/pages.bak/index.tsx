import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [token, setToken] = useState("");
  const [memText, setMemText] = useState("");
  const [message, setMessage] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [memories, setMemories] = useState<any[]>([]);

  const backend = "http://localhost:4000";

  async function register() {
    try {
      const res = await fetch(`${backend}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      const j = await res.json();
      if (j.token) {
        setToken(j.token);
        alert("Registered & token saved");
        fetchMemories(j.token);
      } else {
        alert(JSON.stringify(j));
      }
    } catch (e) {
      alert(String(e));
    }
  }

  async function login() {
    try {
      const res = await fetch(`${backend}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      const j = await res.json();
      if (j.token) {
        setToken(j.token);
        alert("Logged in & token saved");
        fetchMemories(j.token);
      } else {
        alert(JSON.stringify(j));
      }
    } catch (e) {
      alert(String(e));
    }
  }

  async function createMemory() {
    if (!token) return alert("Login first");
    const res = await fetch(`${backend}/api/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: "note", fullText: memText }),
    });
    const j = await res.json();
    alert("Memory created");
    fetchMemories(token);
    setMemText("");
  }

  async function fetchMemories(tkn?: string) {
    const tk = tkn || token;
    if (!tk) return;
    const res = await fetch(`${backend}/api/memories`, {
      headers: { Authorization: `Bearer ${tk}` },
    });
    const j = await res.json();
    setMemories(j.memories || []);
  }

  async function ask() {
    if (!token) return alert("Login first");
    const res = await fetch(`${backend}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
    const j = await res.json();
    setChatReply(JSON.stringify(j, null, 2));
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Second Brain — Mini Demo</h1>

      <section style={{ marginBottom: 20 }}>
        <h3>Register / Login</h3>
        <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="password" style={{ marginLeft: 8 }} value={pass} onChange={(e) => setPass(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button onClick={register}>Register</button>
          <button onClick={login} style={{ marginLeft: 8 }}>Login</button>
        </div>
        <div style={{ marginTop: 8 }}>Token: <small>{token ? token.slice(0, 40) + "..." : "none"}</small></div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3>Create Memory</h3>
        <textarea rows={4} cols={70} value={memText} onChange={(e) => setMemText(e.target.value)} placeholder="Write something to remember..." />
        <div>
          <button onClick={createMemory}>Create Memory</button>
          <button onClick={() => fetchMemories()} style={{ marginLeft: 8 }}>Refresh Memories</button>
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Saved memories:</strong>
          <ul>
            {memories.map((m) => (
              <li key={m.id}><strong>{m.title}</strong> — {m.fullText.slice(0, 80)}{m.fullText.length > 80 ? "..." : ""}</li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3>Chat</h3>
        <input style={{ width: 480 }} placeholder="Ask something..." value={message} onChange={(e) => setMessage(e.target.value)} />
        <button onClick={ask} style={{ marginLeft: 8 }}>Ask</button>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 10 }}>{chatReply}</pre>
      </section>
    </div>
  );
}
