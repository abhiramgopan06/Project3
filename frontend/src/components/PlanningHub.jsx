import { useEffect, useState } from "react";
import { formatMoney } from "../helpers";
import { PLANNING_DATA } from "../planningData";
const TAB_NAMES = ["Overview", "Agenda", "Tasks", "Budget", "Speakers", "Vendors", "Sponsors"];
const TAB_SETTINGS = {
  Agenda: {
    singular: "session",
    fields: [
      ["title", "Session title", "text"],
      ["date", "Date", "date"],
      ["time", "Start time", "time"],
      ["duration", "Duration", "text"],
      ["room", "Room / track", "text"],
      ["owner", "Speaker / owner", "text"],
    ],
  },
  Tasks: {
    singular: "task",
    fields: [
      ["title", "Task name", "text"],
      ["owner", "Assigned to", "text"],
      ["due", "Due date", "date"],
      ["priority", "Priority", "text"],
      ["status", "Status", "text"],
    ],
  },
  Budget: {
    singular: "item",
    fields: [
      ["title", "Expense / income item", "text"],
      ["kind", "Type (Income/Expense)", "text"],
      ["amount", "Amount (₹)", "number"],
      ["due", "Date", "date"],
      ["status", "Payment status", "text"],
    ],
  },
  Speakers: {
    singular: "speaker",
    fields: [
      ["title", "Full name", "text"],
      ["role", "Role / designation", "text"],
      ["organization", "Organization", "text"],
      ["email", "Email", "email"],
      ["session", "Session", "text"],
    ],
  },
  Vendors: {
    singular: "vendor",
    fields: [
      ["title", "Vendor / service", "text"],
      ["contact", "Contact person", "text"],
      ["phone", "Phone", "text"],
      ["amount", "Agreed amount (₹)", "number"],
      ["status", "Contract / payment status", "text"],
    ],
  },
  Sponsors: {
    singular: "sponsor",
    fields: [
      ["title", "Sponsor name", "text"],
      ["package", "Sponsorship package", "text"],
      ["amount", "Amount (₹)", "number"],
      ["contact", "Contact person", "text"],
      ["status", "Agreement / payment status", "text"],
    ],
  },
};

const CHECKLIST = [
  "Confirm venue and capacity",
  "Finalize agenda and speakers",
  "Confirm vendors and contracts",
  "Review budget and payments",
  "Prepare registration and check-in",
  "Confirm safety and accessibility plan",
  "Schedule attendee communications",
];
function makeEmptyRecords() {
  return { Agenda: [], Tasks: [], Budget: [], Speakers: [], Vendors: [], Sponsors: [] };
}
function buildDemoRecords(eventTitle) {
  const source = PLANNING_DATA[eventTitle];
  if (!source) {
    return makeEmptyRecords();
  }

  const records = makeEmptyRecords();

  source.Agenda.forEach(function (item, index) {
    records.Agenda.push({
      id: "demo-agenda-" + index,
      title: item[0],
      date: item[1],
      time: item[2],
      duration: item[3],
      room: item[4],
      owner: item[5],
      done: false,
    });
  });

  source.Tasks.forEach(function (item, index) {
    records.Tasks.push({
      id: "demo-task-" + index,
      title: item[0],
      owner: item[1],
      due: item[2],
      priority: item[3],
      status: item[4],
      done: item[5],
    });
  });

  source.Budget.forEach(function (item, index) {
    records.Budget.push({
      id: "demo-budget-" + index,
      title: item[0],
      kind: item[1],
      amount: item[2],
      due: item[3],
      status: item[4],
      done: false,
    });
  });

  source.Speakers.forEach(function (item, index) {
    records.Speakers.push({
      id: "demo-speaker-" + index,
      title: item[0],
      role: item[1],
      organization: item[2],
      email: item[3],
      session: item[4],
      done: false,
    });
  });

  source.Vendors.forEach(function (item, index) {
    records.Vendors.push({
      id: "demo-vendor-" + index,
      title: item[0],
      contact: item[1],
      phone: item[2],
      amount: item[3],
      status: item[4],
      done: false,
    });
  });

  source.Sponsors.forEach(function (item, index) {
    records.Sponsors.push({
      id: "demo-sponsor-" + index,
      title: item[0],
      package: item[1],
      amount: item[2],
      contact: item[3],
      status: item[4],
      done: false,
    });
  });

  return records;
}

function loadSavedRecords(eventTitle, eventId) {
  const records = buildDemoRecords(eventTitle);
  try {
    const allSaved = JSON.parse(localStorage.getItem("evently-planning-by-event") || "{}");
    const saved = allSaved[String(eventId)] || allSaved[eventTitle];

    if (saved) {
      for (const tab in records) {
        if (Array.isArray(saved[tab])) {
          records[tab] = saved[tab];
        }
      }
    }
  } catch (error) {
  }
  return records;
}
function describeItem(item, separator) {
  const parts = [];
  for (const key in item) {
    const skip = key === "id" || key === "title" || key === "done";
    if (!skip && item[key]) {
      parts.push(key + ": " + item[key]);
    }
  }
  return parts.join(separator);
}
function addUpBudget(budgetItems, wantIncome) {
  let total = 0;
  for (const item of budgetItems) {
    const isIncome = /income/i.test(item.kind || "");
    if (isIncome === wantIncome) {
      total = total + Number(item.amount || 0);
    }
  }
  return total;
}

export default function PlanningHub({ events = [] }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [loadedEventTitle, setLoadedEventTitle] = useState("");
  const [records, setRecords] = useState(makeEmptyRecords);
  const [checklist, setChecklist] = useState(function () {
    return CHECKLIST.reduce(function (result, item) {
      result[item] = false;
      return result;
    }, {});
  });
  const [draft, setDraft] = useState({});

  useEffect(function () {
    if (selectedEventId || events.length === 0) {
      return;
    }

    const firstPlannedEvent = events.find(function (event) {
      return Boolean(PLANNING_DATA[event.title]);
    });
    const firstEvent = firstPlannedEvent || events[0];
    if (firstEvent) {
      setSelectedEventId(String(firstEvent.id));
      setSelectedEventTitle(firstEvent.title);
    }
  }, [events, selectedEventId]);

  useEffect(function () {
    if (!selectedEventTitle) {
      return;
    }
    setRecords(loadSavedRecords(selectedEventTitle, selectedEventId));
    try {
      const allChecklist = JSON.parse(localStorage.getItem("evently-checklist-by-event") || "{}");
      const savedChecklist = allChecklist[String(selectedEventId)] || {};
      setChecklist(CHECKLIST.reduce(function (result, item) {
        result[item] = Boolean(savedChecklist[item]);
        return result;
      }, {}));
    } catch (error) {
      setChecklist(CHECKLIST.reduce(function (result, item) {
        result[item] = false;
        return result;
      }, {}));
    }
    setLoadedEventTitle(selectedEventTitle);
    setActiveTab("Overview");
    setDraft({});
  }, [selectedEventTitle, selectedEventId, events]);

  useEffect(function () {
    if (!selectedEventId || !selectedEventTitle || loadedEventTitle !== selectedEventTitle) {
      return;
    }

    try {
      const allSaved = JSON.parse(localStorage.getItem("evently-planning-by-event") || "{}");
      allSaved[String(selectedEventId)] = records;
      localStorage.setItem("evently-planning-by-event", JSON.stringify(allSaved));

      const allChecklist = JSON.parse(localStorage.getItem("evently-checklist-by-event") || "{}");
      allChecklist[String(selectedEventId)] = checklist;
      localStorage.setItem("evently-checklist-by-event", JSON.stringify(allChecklist));
    } catch (error) {
    }
  }, [records, checklist, selectedEventId, selectedEventTitle, loadedEventTitle]);

  function openTab(tabName) {
    setActiveTab(tabName);
    setDraft({});
  }

  function handleDraftChange(e) {
    setDraft({ ...draft, [e.target.name]: e.target.value });
  }
  function handleAdd(e) {
    e.preventDefault();
    if (!draft.title || draft.title.trim() === "") {
      return;
    }

    const newItem = { ...draft, id: Date.now(), done: false };
    const newRecords = { ...records };
    newRecords[activeTab] = [...records[activeTab], newItem];
    setRecords(newRecords);
    setDraft({});
  }

  function handleRemove(itemId) {
    const newRecords = { ...records };
    newRecords[activeTab] = records[activeTab].filter(function (item) {
      return item.id !== itemId;
    });
    setRecords(newRecords);
  }
  function handleToggleTask(itemId) {
    const newRecords = { ...records };
    newRecords.Tasks = records.Tasks.map(function (item) {
      if (item.id === itemId) {
        return { ...item, done: !item.done };
      }
      return item;
    });
    setRecords(newRecords);
  }
  const income = addUpBudget(records.Budget, true);
  const expenses = addUpBudget(records.Budget, false);
  const openTasks = records.Tasks.filter(function (task) {
    return !task.done;
  }).length;

  function handleChecklistChange(text) {
    setChecklist({ ...checklist, [text]: !checklist[text] });
  }

  return (
    <section className="planning-hub">
      <div className="planning-heading">
        <div>
          <span className="eyebrow">EVENT OPERATIONS</span>
          <h2>Planning workspace</h2>
          <p className="lead">Keep the moving parts of your event organized in one place.</p>
        </div>
      </div>


      <div className="planning-event-picker">
        <label>
          Planning data for
          <select
            value={selectedEventId}
            onChange={function (e) {
              const event = events.find(function (item) {
                return String(item.id) === e.target.value;
              });
              if (event) {
                setSelectedEventId(String(event.id));
                setSelectedEventTitle(event.title);
              }
            }}
          >
            {events.length === 0 && <option value="">No events available</option>}
            {events.map(function (event) {
              return (
                <option key={event.id} value={String(event.id)}>
                  {event.title}
                </option>
              );
            })}
          </select>
        </label>
        <p className="planning-note">
          Each event has its own planning data. The supplied demo information is pre-filled for the five sample events.
        </p>
      </div>


      <div className="planning-tabs" role="tablist">
        {TAB_NAMES.map(function (tabName) {
          return (
            <button
              key={tabName}
              type="button"
              className={activeTab === tabName ? "planning-tab active" : "planning-tab"}
              onClick={() => openTab(tabName)}
            >
              {tabName}
            </button>
          );
        })}
      </div>


      {activeTab === "Overview" && (
        <>
          <div className="planning-stats">
            <article>
              <small>Agenda sessions</small>
              <strong>{records.Agenda.length}</strong>
            </article>
            <article>
              <small>Open tasks</small>
              <strong>{openTasks}</strong>
            </article>
            <article>
              <small>Budget expenses</small>
              <strong>{formatMoney(expenses)}</strong>
            </article>
            <article>
              <small>Projected balance</small>
              <strong>{formatMoney(income - expenses)}</strong>
            </article>
          </div>

          <div className="planning-overview-grid">
            <div className="planning-card">
              <h3>Planning checklist</h3>
              {CHECKLIST.map(function (text) {
                return (
                  <label className="planning-check" key={text}>
                    <input
                      type="checkbox"
                      checked={Boolean(checklist[text])}
                      onChange={() => handleChecklistChange(text)}
                    />
                    {text}
                  </label>
                );
              })}
            </div>

            <div className="planning-card">
              <h3>Quick start</h3>
              <p>Use the tabs to add sessions, assign tasks, track finances, and record your event partners.</p>
              <div className="quick-actions">
                {TAB_NAMES.slice(1).map(function (tabName) {
                  return (
                    <button key={tabName} className="btn ghost small" type="button" onClick={() => openTab(tabName)}>
                      + {tabName}
                    </button>
                  );
                })}
              </div>
              <p className="planning-note">
                Planning entries are saved separately for the selected event in this browser on this device.
              </p>
            </div>
          </div>
        </>
      )}


      {activeTab !== "Overview" && (
        <div className="planning-card">
          <div className="planning-list-heading">
            <div>
              <h3>{activeTab}</h3>
              <p>{records[activeTab].length} item(s)</p>
            </div>
          </div>

          <form className="planning-form" onSubmit={handleAdd}>
            {TAB_SETTINGS[activeTab].fields.map(function (field) {
              const name = field[0];
              const label = field[1];
              const type = field[2];
              return (
                <label key={name}>
                  {label}
                  <input
                    name={name}
                    type={type}
                    required={name === "title"}
                    placeholder={label}
                    value={draft[name] || ""}
                    onChange={handleDraftChange}
                  />
                </label>
              );
            })}
            <button className="btn primary" type="submit">
              + Add {TAB_SETTINGS[activeTab].singular}
            </button>
          </form>

          {records[activeTab].length === 0 ? (
            <div className="empty">Nothing here yet. Add your first item above.</div>
          ) : (
            <div className="planning-records">
              {records[activeTab].map(function (item) {
                return (
                  <article className={item.done ? "planning-record is-done" : "planning-record"} key={item.id}>
                    {activeTab === "Tasks" && (
                      <input
                        aria-label="Mark task complete"
                        type="checkbox"
                        checked={Boolean(item.done)}
                        onChange={() => handleToggleTask(item.id)}
                      />
                    )}

                    <div className="planning-record-main">
                      <strong>{item.title}</strong>
                      <small>{describeItem(item, " · ")}</small>
                    </div>

                    <button type="button" className="btn ghost small danger" onClick={() => handleRemove(item.id)}>
                      Remove
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
