import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../helpers";
import StatBox from "../components/StatBox";

export default function AttendeesPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");

  async function loadAttendees() {
    try {
      const response = await api.get("/events/events/" + id + "/attendees/");
      setData(response.data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load attendees for this event."));
    }
  }

  useEffect(function () {
    loadAttendees();
  }, [id]);

  async function updateAttendance(bookingId, status) {
    setSavingId(bookingId);
    setMessage("");
    try {
      await api.post("/events/events/" + id + "/attendance/", {
        booking_id: bookingId,
        status: status,
      });
      setMessage("Attendance saved.");
      await loadAttendees();
    } catch (err) {
      setMessage(getErrorMessage(err, "Could not save attendance."));
    } finally {
      setSavingId("");
    }
  }

  if (error) {
    return (
      <div className="section">
        <Link className="btn ghost small" to="/organizer">← Back to your events</Link>
        <div className="notice">{error}</div>
      </div>
    );
  }

  if (!data) return <div className="empty section">Loading attendees...</div>;

  const attendedCount = data.attendees.filter((person) => person.status === "attended").length;
  const absentCount = data.attendees.filter((person) => person.status === "absent").length;

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <Link className="btn ghost small" to="/organizer">← Back to your events</Link>
          <span className="eyebrow">ORGANIZER ATTENDANCE</span>
          <h1>{data.event_title}</h1>
          <p className="lead">Mark each confirmed booking as attended or absent. Only attendees marked as attended can write a review.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatBox label="Total seats" value={data.total_seats} icon="🪑" />
        <StatBox label="Attended" value={attendedCount} icon="✅" />
        <StatBox label="Absent" value={absentCount} icon="✖️" />
        <StatBox label="Vacant" value={data.vacant_seats} icon="🟢" />
      </div>

      {message && <div className="notice">{message}</div>}
      <h2>Booked attendees ({data.attendees.length})</h2>
      {data.attendees.length === 0 ? (
        <div className="empty">No confirmed bookings yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="attendee-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Tickets</th><th>Booking ID</th><th>Status</th><th>Booked on</th><th>Attendance</th></tr>
            </thead>
            <tbody>
              {data.attendees.map(function (attendee) {
                return (
                  <tr key={attendee.booking_id}>
                    <td>{attendee.name}</td>
                    <td>{attendee.email || "—"}</td>
                    <td>{attendee.ticket_quantity}</td>
                    <td>{attendee.booking_id}</td>
                    <td><span className={"status " + attendee.status}>{attendee.status}</span></td>
                    <td>{new Date(attendee.booked_at).toLocaleString()}</td>
                    <td>
                      <div className="attendance-actions">
                        <button className="btn primary small" disabled={savingId === attendee.booking_id} onClick={() => updateAttendance(attendee.booking_id, "attended")}>Attended</button>
                        <button className="btn ghost small" disabled={savingId === attendee.booking_id} onClick={() => updateAttendance(attendee.booking_id, "absent")}>Absent</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
