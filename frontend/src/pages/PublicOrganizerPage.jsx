import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import EventCard from "../components/EventCard";
import { getErrorMessage } from "../helpers";

export default function PublicOrganizerPage() {
  const { organizerId } = useParams();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(function () {
    setLoading(true);
    api.get("/events/events/organizer/" + organizerId + "/")
      .then(function (response) { setEvents(response.data || []); setError(""); })
      .catch(function (err) { setError(getErrorMessage(err, "Could not load this organizer's events.")); })
      .finally(function () { setLoading(false); });
  }, [organizerId]);
  const today = new Date();
  const todayText = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const currentEvents = events.filter((event) => event.date >= todayText);
  const previousEvents = events.filter((event) => event.date < todayText);
  const organizerName = events.length ? events[0].organizer_name : "Event Organizer";
  return <div className="section public-organizer-page">
    <Link className="back" to="/">← Back to events</Link>
    <header className="public-organizer-hero">
      <span className="eyebrow">ORGANIZER PROFILE</span>
      <h1>{organizerName}</h1>
      <p>Explore upcoming events and look back at this organizer's previous events.</p>
      <div className="organizer-counts"><span><b>{currentEvents.length}</b> upcoming events</span><span><b>{previousEvents.length}</b> previous events</span></div>
    </header>
    {error && <div className="error">{error}</div>}
    {loading ? <div className="empty">Loading organizer events...</div> : <>
      <section className="organizer-public-section">
        <div className="section-head"><div><span className="eyebrow">COMING UP</span><h2>Present events</h2><p className="muted">Events that are happening today or in the future.</p></div><span className="muted">{currentEvents.length} events</span></div>
        {currentEvents.length ? <div className="grid">{currentEvents.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="empty">No upcoming events published by this organizer.</div>}
      </section>
      <section className="organizer-public-section previous-organizer-section">
        <div className="section-head"><div><span className="eyebrow">EVENT ARCHIVE</span><h2>Previous events</h2><p className="muted">Expired events are shown in a softer shade. Select a card to view event information and reviews.</p></div><span className="muted">{previousEvents.length} events</span></div>
        {previousEvents.length ? <div className="grid">{previousEvents.map((event) => <Link key={event.id} to={"/organizer-events/" + event.id} className="event-card expired-event-card">
          <div className="event-image">{event.image_url ? <img src={event.image_url} alt={event.title} /> : <div className="image-placeholder">✦</div>}<span className="expired-event-badge">Previous event</span></div>
          <div className="event-body"><span className="tag">{event.category_name || "Event"}</span><h3>{event.title}</h3><p>{event.description.slice(0, 105)}{event.description.length > 105 ? "..." : ""}</p><div className="event-meta"><span>📍 {event.location}</span><b>{event.date}</b></div><span className="expired-card-note">Event ended · View details & reviews →</span></div>
        </Link>)}</div> : <div className="empty">There are no previous events to show yet.</div>}
      </section>
    </>}
  </div>;
}
