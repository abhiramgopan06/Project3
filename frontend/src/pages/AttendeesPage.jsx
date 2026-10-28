import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../helpers";
import StatBox from "../components/StatBox";
import TicketScanner from "../components/TicketScanner";

export default function AttendeesPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [scannerOpen, setScannerOpen] = useState(searchParams.get("scan") === "1");

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

  const handleScan = useCallback(async function (ticketToken) {
    setMessage("Checking ticket...");
    try {
      const response = await api.post("/events/events/" + id + "/scan-ticket/", { ticket_token: ticketToken });
      setMessage("✓ " + response.data.attendee + " checked in successfully. Booking " + response.data.booking_id + ".");
      setScannerOpen(false);
      await loadAttendees();
    } catch (err) {
      setMessage(getErrorMessage(err, "Ticket could not be checked in."));
      setScannerOpen(false);
    }
  }, [id]);

  async function approveCancellation(bookingPk) {
    setSavingId(String(bookingPk));
    try {
      await api.post("/bookings/bookings/" + bookingPk + "/approve-cancellation/");
      setMessage("Cancellation approved. The seats have been released. In mock-payment mode, refund status is simulated.");
      await loadAttendees();
    } catch (err) {
      setMessage(getErrorMessage(err, "Could not approve the cancellation."));
    } finally {
      setSavingId("");
    }
  }

  async function exportAttendees() {
    try {
      const response = await api.get("/events/events/" + id + "/attendees-export/", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "evently-attendees-" + id + ".csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(getErrorMessage(err, "Could not export the attendee list."));
    }
  }

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
          <p className="lead">Scan each attendee's unique QR ticket to record attendance automatically, or search and update a booking manually.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatBox label="Total seats" value={data.total_seats} icon="🪑" />
        <StatBox label="Attended" value={attendedCount} icon="✅" />
        <StatBox label="Absent" value={absentCount} icon="✖️" />
        <StatBox label="Vacant" value={data.vacant_seats} icon="🟢" />
      </div>

      {message && <div className="notice">{message}</div>}
      <div className="attendee-tools">
        <label className="attendee-search"><span>Search attendees</span><input type="search" value={searchText} onChange={function (event) { setSearchText(event.target.value); }} placeholder="Name, email or booking ID" /></label>
        <div className="attendee-tool-actions"><button className="btn primary" type="button" onClick={() => setScannerOpen(!scannerOpen)}>{scannerOpen ? "Hide scanner" : "Open QR scanner"}</button><button className="btn ghost" type="button" onClick={exportAttendees}>Export CSV</button></div>
      </div>
      {scannerOpen && <TicketScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />}
      <h2>Booked attendees ({data.attendees.length})</h2>
      {data.attendees.length === 0 ? (
        <div className="empty">No confirmed bookings yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="attendee-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Seats</th><th>Tickets</th><th>Booking ID</th><th>Status</th><th>Booked on</th><th>Attendance</th></tr>
            </thead>
            <tbody>
              {data.attendees.filter(function (attendee) { return (attendee.name + " " + attendee.email + " " + attendee.booking_id).toLowerCase().includes(searchText.toLowerCase()); }).map(function (attendee) {
                return (
                  <tr key={attendee.booking_id}>
                    <td>{attendee.name}</td>
                    <td>{attendee.email || "—"}</td>
                    <td>{attendee.seat_labels?.length ? attendee.seat_labels.join(", ") : "General"}</td>
                    <td>{attendee.ticket_quantity}</td>
                    <td>{attendee.booking_id}</td>
                    <td><span className={"status " + attendee.status}>{attendee.status}</span>{attendee.checked_in_at && <small className="attendee-checkin-time">Checked in: {new Date(attendee.checked_in_at).toLocaleString()}</small>}</td>
                    <td>{new Date(attendee.booked_at).toLocaleString()}</td>
                    <td>
                      <div className="attendance-actions">
                        {attendee.cancellation_requested ? <button className="btn primary small" disabled={savingId === String(attendee.id)} onClick={() => approveCancellation(attendee.id)}>Approve cancellation</button> : <>
                          <button className="btn primary small" disabled={savingId === attendee.booking_id || attendee.status === "attended"} onClick={() => updateAttendance(attendee.booking_id, "attended")}>Attended</button>
                          <button className="btn ghost small" disabled={savingId === attendee.booking_id || attendee.status === "attended"} onClick={() => updateAttendance(attendee.booking_id, "absent")}>Absent</button>
                        </>}
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
