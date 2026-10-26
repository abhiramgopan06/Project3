import { useEffect, useState } from "react";
import api from "../api";
import { formatMoney, getErrorMessage } from "../helpers";

export default function BookingsPage({ user }) {
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState("");
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [savingId, setSavingId] = useState(null);

  async function loadBookings() {
    try {
      const response = await api.get("/bookings/bookings/");
      setBookings(response.data);
    } catch (error) {
      setBookings([]);
    }
  }

  async function loadReviews() {
    try {
      const response = await api.get("/events/reviews/");
      setReviews(Array.isArray(response.data) ? response.data : (response.data.results || []));
    } catch (error) {
      setReviews([]);
    }
  }

  useEffect(function () {
    loadBookings();
    loadReviews();
  }, []);

  async function handlePay(bookingId) {
    try {
      await api.post("/bookings/bookings/" + bookingId + "/pay/");
      setMessage("Payment successful. Booking confirmed.");
      loadBookings();
    } catch (error) {
      setMessage(getErrorMessage(error, "Payment failed. Please try again."));
    }
  }

  async function handleCancel(bookingId) {
    try {
      await api.post("/bookings/bookings/" + bookingId + "/cancel/");
      setMessage("Booking cancelled.");
      loadBookings();
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not cancel this booking."));
    }
  }

  async function handleReview(booking) {
    setMessage("");
    setSavingId(booking.id);
    try {
      await api.post("/events/reviews/", {
        event: booking.event,
        rating: Number(ratings[booking.event] || 5),
        comment: (comments[booking.event] || "").trim(),
      });
      setMessage("Thank you! Your rating and review have been submitted.");
      await loadReviews();
      setComments((current) => ({ ...current, [booking.event]: "" }));
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not submit your review. Please try again."));
    } finally {
      setSavingId(null);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eligibleBookings = bookings.filter((booking) => {
    if (booking.status !== "attended" || !booking.event_date) return false;
    const eventDate = new Date(booking.event_date + "T00:00:00");
    return !Number.isNaN(eventDate.getTime()) && eventDate <= today;
  });

  function hasReviewed(booking) {
    return reviews.some((review) => String(review.event) === String(booking.event) && String(review.user) === String(user?.id));
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <span className="eyebrow">YOUR ACTIVITY</span>
          <h2>My bookings</h2>
        </div>
      </div>

      {message && <div className="notice">{message}</div>}

      <div className="booking-list">
        {bookings.map(function (booking) {
          const canCancel = booking.status !== "cancelled" && booking.status !== "attended" && booking.status !== "absent";
          return (
            <div className="booking-row" key={booking.id}>
              <div className="booking-code">{booking.booking_id}</div>
              <div>
                <h3>{booking.event_title}</h3>
                <p>📅 {booking.event_date} · 📍 {booking.event_location}</p>
              </div>
              <div>
                <b>{formatMoney(booking.total_amount)}</b>
                <small>{booking.ticket_quantity} ticket(s)</small>
              </div>
              <span className={"status " + booking.status}>{booking.status}</span>
              {booking.status === "pending" && <button className="btn primary small" onClick={() => handlePay(booking.id)}>Mock Pay</button>}
              {canCancel && <button className="btn ghost small" onClick={() => handleCancel(booking.id)}>Cancel</button>}
            </div>
          );
        })}
        {bookings.length === 0 && <div className="empty">You have no bookings yet.</div>}
      </div>

      <section className="section feedback-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">SHARE YOUR EXPERIENCE</span>
            <h2>Ratings &amp; Reviews</h2>
            <p className="muted">After an event is over and the organizer marks you as attended, you can rate it and share your opinion here.</p>
          </div>
        </div>
        {eligibleBookings.length === 0 ? (
          <div className="empty">No reviews to write yet. Your review card will appear here after an event has ended and your attendance is confirmed.</div>
        ) : (
          <div className="feedback-grid">
            {eligibleBookings.map((booking) => (
              <article className="feedback-card" key={booking.id}>
                <div className="feedback-card-top">
                  <span className="feedback-icon">★</span>
                  <span className="feedback-tag">EVENT COMPLETED</span>
                </div>
                <h3>{booking.event_title}</h3>
                <p className="muted">Event date: {booking.event_date}</p>
                {hasReviewed(booking) ? (
                  <div className="review-submitted"><strong>✓ Review submitted</strong><p>Thank you for sharing your experience.</p></div>
                ) : (
                  <form className="panel review-form feedback-form" onSubmit={(event) => { event.preventDefault(); handleReview(booking); }}>
                    <label htmlFor={`rating-${booking.event}`}>How would you rate this event?</label>
                    <select id={`rating-${booking.event}`} value={ratings[booking.event] || 5} onChange={(event) => setRatings((current) => ({ ...current, [booking.event]: Number(event.target.value) }))}>
                      <option value={5}>★★★★★ — Excellent</option>
                      <option value={4}>★★★★☆ — Good</option>
                      <option value={3}>★★★☆☆ — Okay</option>
                      <option value={2}>★★☆☆☆ — Needs improvement</option>
                      <option value={1}>★☆☆☆☆ — Poor</option>
                    </select>
                    <label htmlFor={`comment-${booking.event}`}>Your opinion</label>
                    <textarea id={`comment-${booking.event}`} required minLength={2} maxLength={2000} placeholder="What did you like? What could be improved?" value={comments[booking.event] || ""} onChange={(event) => setComments((current) => ({ ...current, [booking.event]: event.target.value }))} />
                    <button className="btn primary" disabled={savingId === booking.id}>{savingId === booking.id ? "Submitting..." : "Submit rating & review"}</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
