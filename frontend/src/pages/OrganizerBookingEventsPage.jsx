import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../helpers";

function isPreviousEvent(event) {
  const now = new Date();
  const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  return event.date < today || ["inactive", "completed", "cancelled", "rejected"].includes(event.status);
}

function EventCard({ event, previous, onDelete }) {
  return (
    <article className="mini-event organizer-booking-event">
      <div className="mini-event-main">
        <div className="mini-event-top">
          <span className={"status " + event.status}>{previous ? "Previous" : event.status}</span>
          <small>{event.date}</small>
        </div>
        <h3>{event.title}</h3>
        <p>{event.location}{event.address ? " · " + event.address : ""}</p>
        <div className="mini-event-meta">
          <span>{event.capacity} seats</span>
          <span>₹{Number(event.ticket_price || 0).toLocaleString("en-IN")}</span>
          <span>{event.start_time} - {event.end_time}</span>
        </div>
      </div>

      <div className="mini-event-actions organizer-event-actions">
        <Link className="btn ghost small" to={"/organizer/events/" + event.id + "/attendees"}>
          Attendees
        </Link>
        <Link className="btn ghost small" to={"/organizer?edit=" + event.id}>
          Edit
        </Link>
        <button type="button" className="btn ghost small danger" onClick={function () { onDelete(event); }}>
          Delete
        </button>
      </div>
    </article>
  );
}

export default function OrganizerBookingEventsPage() {
  const [events, setEvents] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(function () { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [searchText, setSearchText] = useState("");

  async function loadEvents() {
    try {
      const response = await api.get("/events/events/mine/");
      setEvents(response.data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not load your events."));
    }
  }

  useEffect(function () {
    loadEvents();
  }, []);

  async function handleDelete(event) {
    const sure = window.confirm("Delete \"" + event.title + "\"? This cannot be undone.");
    if (!sure) {
      return;
    }

    try {
      await api.delete("/events/events/" + event.id + "/");
      setEvents(function (current) {
        return current.filter(function (item) {
          return item.id !== event.id;
        });
      });
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not delete this event."));
    }
  }

  const calendarDays = useMemo(function () {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: firstDay + daysInMonth }, function (_, index) {
      if (index < firstDay) return null;
      const day = index - firstDay + 1;
      return { day: day, date: year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0") };
    });
  }, [calendarMonth]);

  const matchingEvents = events.filter(function (event) {
    const text = (event.title + " " + event.location + " " + event.status).toLowerCase();
    return text.includes(searchText.toLowerCase());
  });

  const upcomingEvents = events
    .filter(function (event) {
      return !isPreviousEvent(event) && matchingEvents.some(function (match) { return match.id === event.id; });
    })
    .sort(function (a, b) {
      return a.date.localeCompare(b.date) || String(a.start_time).localeCompare(String(b.start_time));
    });

  const previousEvents = events
    .filter(function (event) {
      return isPreviousEvent(event) && matchingEvents.some(function (match) { return match.id === event.id; });
    })
    .sort(function (a, b) {
      return b.date.localeCompare(a.date) || String(b.start_time).localeCompare(String(a.start_time));
    });

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <span className="eyebrow">ORGANIZER EVENTS</span>
          <h1>Booking Events</h1>
          <p className="lead">Keep your active events and event history in separate sections so everything is easy to find.</p>
        </div>
        <Link className="btn ghost" to="/organizer">Create or manage events</Link>
      </div>

      {errorMessage && <div className="error">{errorMessage}</div>}

      <div className="organizer-overview-grid">
        <article className="organizer-overview-card"><span className="organizer-overview-icon">▦</span><div><p>Total events</p><strong>{events.length}</strong><small>All events you manage</small></div></article>
        <article className="organizer-overview-card"><span className="organizer-overview-icon">◷</span><div><p>Upcoming events</p><strong>{events.filter(function (event) { return !isPreviousEvent(event); }).length}</strong><small>Ready to prepare</small></div></article>
        <article className="organizer-overview-card"><span className="organizer-overview-icon">✓</span><div><p>Event history</p><strong>{events.filter(isPreviousEvent).length}</strong><small>Previous and expired</small></div></article>
        <article className="organizer-overview-card organizer-overview-action"><span className="organizer-overview-icon">＋</span><div><p>Create something new</p><Link to="/organizer">Create an event <span aria-hidden="true">→</span></Link><small>Publish after admin approval</small></div></article>
      </div>

      <section className="organizer-calendar-panel">
        <div className="organizer-calendar-heading"><div><span className="eyebrow">YOUR SCHEDULE</span><h2>{calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><p className="hint">Select a date to see the events scheduled for that day.</p></div><div className="organizer-calendar-controls"><button className="btn ghost small" type="button" aria-label="Previous month" onClick={function () { setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)); }}>‹</button><button className="btn ghost small" type="button" onClick={function () { const now = new Date(); setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }}>Today</button><button className="btn ghost small" type="button" aria-label="Next month" onClick={function () { setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)); }}>›</button></div></div>
        <div className="organizer-calendar-grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(function (day) { return <div className="organizer-calendar-weekday" key={day}>{day}</div>; })}{calendarDays.map(function (item, index) { const dayEvents = item ? events.filter(function (event) { return event.date === item.date; }) : []; return <div key={item ? item.date : "blank-" + index} className={"organizer-calendar-day" + (item && dayEvents.length ? " has-events" : "")}>{item && <><span className="organizer-calendar-number">{item.day}</span>{dayEvents.slice(0, 2).map(function (event) { return <span key={event.id} className="organizer-calendar-event" title={event.title}>{event.title}</span>; })}{dayEvents.length > 2 && <small>+{dayEvents.length - 2} more</small>}</>}</div>; })}</div>
      </section>

      <div className="organizer-event-search"><label htmlFor="organizer-event-search">Find an event</label><input id="organizer-event-search" type="search" value={searchText} onChange={function (event) { setSearchText(event.target.value); }} placeholder="Search by event name, location or status" /><span>{matchingEvents.length} of {events.length} events</span></div>

      <section className="organizer-event-section">
        <div className="section-head compact-head">
          <div>
            <span className="eyebrow">ACTIVE EVENTS</span>
            <h2>Upcoming and current events</h2>
            <p className="hint">These are the events that can currently be prepared for and managed.</p>
          </div>
          <span className="event-count">{upcomingEvents.length} event(s)</span>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="mini-event-grid">
            {upcomingEvents.map(function (event) {
              return <EventCard key={event.id} event={event} previous={false} onDelete={handleDelete} />;
            })}
          </div>
        ) : (
          <div className="empty">No upcoming or current events yet.</div>
        )}
      </section>

      <section className="organizer-event-section history-section">
        <div className="section-head compact-head">
          <div>
            <span className="eyebrow">EVENT HISTORY</span>
            <h2>Previous and expired events</h2>
            <p className="hint">Expired events stay here for your records and are hidden from attendees.</p>
          </div>
          <span className="event-count">{previousEvents.length} event(s)</span>
        </div>

        {previousEvents.length > 0 ? (
          <div className="mini-event-grid">
            {previousEvents.map(function (event) {
              return <EventCard key={event.id} event={event} previous={true} onDelete={handleDelete} />;
            })}
          </div>
        ) : (
          <div className="empty">No previous or expired events yet.</div>
        )}
      </section>
    </div>
  );
}
