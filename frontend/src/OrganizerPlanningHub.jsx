import { useEffect, useState } from "react";

const tabs = ["Overview", "Agenda", "Tasks", "Budget", "Speakers", "Vendors", "Sponsors"];
const empty = { Agenda: [], Tasks: [], Budget: [], Speakers: [], Vendors: [], Sponsors: [] };
const fields = {
  Agenda: [["title", "Session title"], ["date", "Date", "date"], ["time", "Start time", "time"], ["duration", "Duration"], ["room", "Room / track"], ["owner", "Speaker / owner"]],
  Tasks: [["title", "Task name"], ["owner", "Assigned to"], ["due", "Due date", "date"], ["priority", "Priority"], ["status", "Status"]],
  Budget: [["title", "Expense / income item"], ["kind", "Type (Income/Expense)"], ["amount", "Amount (₹)", "number"], ["due", "Date", "date"], ["status", "Payment status"]],
  Speakers: [["title", "Full name"], ["role", "Role / designation"], ["organization", "Organization"], ["email", "Email", "email"], ["session", "Session"]],
  Vendors: [["title", "Vendor / service"], ["contact", "Contact person"], ["phone", "Phone"], ["amount", "Agreed amount (₹)", "number"], ["status", "Contract / payment status"]],
  Sponsors: [["title", "Sponsor name"], ["package", "Sponsorship package"], ["amount", "Amount (₹)", "number"], ["contact", "Contact person"], ["status", "Agreement / payment status"]],
};
const money = value => "₹" + Number(value || 0).toLocaleString("en-IN");

export default function OrganizerPlanningHub() {
  const [tab, setTab] = useState("Overview");
  const [records, setRecords] = useState(() => {
    try { return { ...empty, ...JSON.parse(localStorage.getItem("evently-planning") || "{}") }; }
    catch { return empty; }
  });
  const [draft, setDraft] = useState({});
  useEffect(() => { localStorage.setItem("evently-planning", JSON.stringify(records)); }, [records]);
  const tasks = records.Tasks || [];
  const income = records.Budget.filter(x => /income/i.test(x.kind || "")).reduce((s, x) => s + Number(x.amount || 0), 0);
  const expenses = records.Budget.filter(x => !/income/i.test(x.kind || "")).reduce((s, x) => s + Number(x.amount || 0), 0);
  function add(e) {
    e.preventDefault(); if (!draft.title?.trim()) return;
    setRecords(prev => ({ ...prev, [tab]: [...(prev[tab] || []), { ...draft, id: Date.now(), done: false }] })); setDraft({});
  }
  function remove(id) { setRecords(prev => ({ ...prev, [tab]: prev[tab].filter(x => x.id !== id) })); }
  function toggle(id) { setRecords(prev => ({ ...prev, Tasks: prev.Tasks.map(x => x.id === id ? { ...x, done: !x.done } : x) })); }
  return <section className="planning-hub">
    <div className="planning-heading"><div><span className="eyebrow">EVENT OPERATIONS</span><h2>Planning workspace</h2><p className="lead">Keep the moving parts of your event organized in one place.</p></div></div>
    <div className="planning-tabs" role="tablist">{tabs.map(item => <button key={item} type="button" className={`planning-tab ${tab === item ? "active" : ""}`} onClick={() => { setTab(item); setDraft({}); }}>{item}</button>)}</div>
    {tab === "Overview" ? <>
      <div className="planning-stats"><article><small>Agenda sessions</small><strong>{records.Agenda.length}</strong></article><article><small>Open tasks</small><strong>{tasks.filter(x => !x.done).length}</strong></article><article><small>Budget expenses</small><strong>{money(expenses)}</strong></article><article><small>Projected balance</small><strong>{money(income - expenses)}</strong></article></div>
      <div className="planning-overview-grid"><div className="planning-card"><h3>Planning checklist</h3>{["Confirm venue and capacity", "Finalize agenda and speakers", "Confirm vendors and contracts", "Review budget and payments", "Prepare registration and check-in", "Confirm safety and accessibility plan", "Schedule attendee communications"].map((x, i) => <label className="planning-check" key={i}><input type="checkbox" />{x}</label>)}</div><div className="planning-card"><h3>Quick start</h3><p>Use the tabs to add sessions, assign tasks, track finances, and record your event partners.</p><div className="quick-actions">{tabs.slice(1).map(x => <button key={x} className="btn ghost small" type="button" onClick={() => setTab(x)}>+ {x}</button>)}</div><p className="planning-note">Planning workspace entries are saved in this browser on this device. They are separate from server-backed event and booking records.</p></div></div>
    </> : <div className="planning-card"><div className="planning-list-heading"><div><h3>{tab}</h3><p>{records[tab].length} item(s)</p></div></div>
      <form className="planning-form" onSubmit={add}>{fields[tab].map(([key, label, type]) => <label key={key}>{label}<input required={key === "title"} type={type || "text"} value={draft[key] || ""} onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))} placeholder={label} /></label>)}<button className="btn primary" type="submit">+ Add {tab === "Budget" ? "item" : tab.slice(0, -1) || "item"}</button></form>
      {records[tab].length === 0 ? <div className="empty">Nothing here yet. Add your first item above.</div> : <div className="planning-records">{records[tab].map(item => <article className={`planning-record ${item.done ? "is-done" : ""}`} key={item.id}>{tab === "Tasks" && <input aria-label="Mark task complete" type="checkbox" checked={!!item.done} onChange={() => toggle(item.id)} />}<div className="planning-record-main"><strong>{item.title}</strong><small>{Object.entries(item).filter(([k, v]) => !["id", "title", "done"].includes(k) && v).map(([k, v]) => `${k}: ${v}`).join(" · ")}</small></div><button type="button" className="btn ghost small danger" onClick={() => remove(item.id)}>Remove</button></article>)}</div>}
    </div>}
  </section>;
}
