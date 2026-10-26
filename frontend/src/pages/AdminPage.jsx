import { useEffect, useState } from "react";
import api from "../api";
import { getErrorMessage } from "../helpers";
import DashboardStats from "../components/DashboardStats";
import { BACKEND_URL } from "../api";
import { Link } from "react-router-dom";

export default function AdminPage() {
  const [pendingOrganizers, setPendingOrganizers] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  function getList(data) {
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.results)) {
      return data.results;
    }
    return [];
  }

  async function loadEvents() {
    try {
      const [pendingResponse, allResponse] = await Promise.all([
        api.get("/events/events/", { params: { status: "pending" } }),
        api.get("/events/events/")
      ]);
      setPendingEvents(getList(pendingResponse.data));
      setAllEvents(getList(allResponse.data));
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not load events. Please refresh and try again."));
    } finally {
      setLoading(false);
    }
  }

  async function loadOrganizers() {
    try {
      const response = await api.get("/auth/organizers/pending/");
      setPendingOrganizers(getList(response.data));
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not load organizer requests."));
    }
  }

  useEffect(function () {
    loadEvents();
    loadOrganizers();
  }, []);

  async function handleApproveEvent(eventId) {
    try {
      await api.post("/events/events/" + eventId + "/approve/");
      setMessage("Event approved — it's now visible to everyone.");
      loadEvents();
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not approve this event."));
    }
  }

  async function handleRejectEvent(eventId) {
    try {
      await api.post("/events/events/" + eventId + "/reject/");
      setMessage("Event rejected.");
      loadEvents();
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not reject this event."));
    }
  }

  async function handleDeleteEvent(eventId) {
    const sure = window.confirm("Delete this event? This cannot be undone.");
    if (!sure) {
      return;
    }

    try {
      await api.delete("/events/events/" + eventId + "/");
      setMessage("Event deleted.");
      loadEvents();
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not delete this event."));
    }
  }

  async function handleApproveOrganizer(userId) {
    try {
      await api.post("/auth/organizers/" + userId + "/approve/");
      setMessage("Organizer approved — they can now log in.");
      loadOrganizers();
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not approve this organizer."));
    }
  }

  async function handleRejectOrganizer(userId) {
    try {
      await api.post("/auth/organizers/" + userId + "/reject/");
      setMessage("Organizer request rejected.");
      loadOrganizers();
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not reject this organizer."));
    }
  }



  return (
    <div className="section admin-page-wrap">
      <DashboardStats
        title="Admin Dashboard"
        subtitle="Approve new events and manage everything on the platform."
      />

      {message && <div className="notice" role="status">{message}</div>}
      {loading && <div className="empty" role="status">Loading platform events…</div>}

      <section className="section dashboard-admin-link">
        <div className="dashboard-card">
          <h3>Django Admin Dashboard</h3>
          <p>Open the Django administration page to manage the system.</p>
          <a
            className="btn primary"
            href={BACKEND_URL + "/admin/"}
            target="_blank"
            rel="noreferrer"
          >
            Open Django Admin
          </a>
        </div>
      </section>


      <div className="section-head">
        <div>
          <span className="eyebrow">NEEDS YOUR ATTENTION</span>
          <h2>Organizer requests ({pendingOrganizers.length})</h2>
        </div>
      </div>

      <div className="admin-event-list">
        {pendingOrganizers.map(function (organizer) {
          return (
            <div className="mini-event" key={organizer.id}>
              <div>
                <b>
                  {organizer.first_name || organizer.username} {organizer.last_name}
                </b>
                <small>
                  @{organizer.username} · {organizer.email}
                </small>
              </div>
              <div className="mini-event-actions">
                <button className="btn primary small" onClick={() => handleApproveOrganizer(organizer.id)}>
                  Approve
                </button>
                <button className="btn ghost small danger" onClick={() => handleRejectOrganizer(organizer.id)}>
                  Reject
                </button>
              </div>
            </div>
          );
        })}

        {pendingOrganizers.length === 0 && <div className="empty">No organizer requests waiting right now.</div>}
      </div>


      <div className="section-head admin-section-spacing">
        <div>
          <span className="eyebrow">NEEDS YOUR ATTENTION</span>
          <h2>Pending events ({pendingEvents.length})</h2>
        </div>
      </div>

      <div className="admin-event-list">
        {pendingEvents.map(function (event) {
          return (
            <div className="mini-event" key={event.id}>
              <div>
                <b className="admin-event-title">{event.title}</b>
                <small className="admin-event-description">
                  <span>▦ {event.date}</span><span>⌖ {event.location}</span><span>by {event.organizer_name}</span>
                </small>
              </div>
              <div className="mini-event-actions">
                <button className="btn primary small" onClick={() => handleApproveEvent(event.id)}>
                  Approve
                </button>
                <button className="btn ghost small danger" onClick={() => handleRejectEvent(event.id)}>
                  Reject
                </button>
              </div>
            </div>
          );
        })}

        {pendingEvents.length === 0 && <div className="empty">No events waiting for approval right now.</div>}
      </div>


      <div className="section-head admin-section-spacing">
        <div>
          <span className="eyebrow">EVERY EVENT</span>
          <h2>All events on the platform ({allEvents.length})</h2>
        </div>
      </div>

      <div className="admin-event-list">
        {allEvents.map(function (event) {
          return (
            <div key={event.id}>
              <div className="mini-event">
                <div>
                  <b className="admin-event-title">{event.title}</b>
                  <small className="admin-event-description">
                    <span>▦ {event.date}</span><span>⌖ {event.location}</span><span>by {event.organizer_name}</span>
                  </small>
                </div>
                <div className="mini-event-actions">
                  <span className={"status admin-status " + String(event.status || "inactive").toLowerCase()}>{event.status || "Inactive"}</span>
                  <Link className="btn ghost small" to={"/events/" + event.id}>
                    Event Details
                  </Link>
                  <button className="btn ghost small danger" onClick={() => handleDeleteEvent(event.id)}>
                    Delete
                  </button>
                </div>
              </div>

            </div>
          );
        })}

        {allEvents.length === 0 && <div className="empty">No events yet.</div>}
      </div>
    </div>
  );
}
