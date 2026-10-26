import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../helpers";

export default function OrganizerHistoryPage() {
  const [events, setEvents] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(function () {
    api.get("/events/events/history/")
      .then(function (response) {
        setEvents(response.data);
      })
      .catch(function (error) {
        setErrorMessage(getErrorMessage(error, "Could not load previous events."));
      });
  }, []);

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <span className="eyebrow">ORGANIZER HISTORY</span>
          <h1>Previous and expired events</h1>
          <p className="lead">Your old events stay here for your records. They are hidden from attendees.</p>
        </div>
        <Link className="btn ghost" to="/organizer">← Back to organizer</Link>
      </div>

      {errorMessage && <div className="error">{errorMessage}</div>}

      <div className="history-list">
        {events.map(function (event) {
          return (
            <div className="mini-event" key={event.id}>
              <div>
                <b>{event.title}</b>
                <small>{event.date} · {event.location}</small>
                <small>{event.capacity} seats · {event.status}</small>
              </div>
              <div className="mini-event-actions">
                <span className="status inactive">Expired / Previous</span>
                <Link className="btn ghost small" to={"/organizer/events/" + event.id + "/attendees"}>
                  Attendees
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && !errorMessage && (
        <div className="empty">You do not have any previous or expired events yet.</div>
      )}
    </div>
  );
}
