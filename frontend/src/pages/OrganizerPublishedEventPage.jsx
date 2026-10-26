import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import ImageGallery from "../components/ImageGallery";
import { formatDate, formatMoney, getErrorMessage } from "../helpers";

export default function OrganizerPublishedEventPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  useEffect(function () {
    api.get("/events/events/" + id + "/").then((response) => setEvent(response.data)).catch((err) => setError(getErrorMessage(err, "Could not load this event.")));
  }, [id]);
  if (error) return <div className="section"><div className="error">{error}</div><Link className="btn ghost" to="/">Back to events</Link></div>;
  if (!event) return <div className="empty">Loading event information...</div>;
  const reviews = event.reviews || [];
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : 0;
  const images = [];
  if (event.image_url) images.push({ id: "cover", image_url: event.image_url });
  (event.images || []).forEach((image) => images.push(image));
  const expired = event.date < new Date().toISOString().slice(0, 10);
  return <div className="section published-event-page">
    <Link className="back" to={"/organizers/" + event.organizer}>← Back to {event.organizer_name}'s events</Link>
    <div className="detail-layout"><ImageGallery images={images} /><div className="detail-info"><span className="tag">{event.category_name || "Event"}</span><h1>{event.title}</h1>{expired && <span className="expired-event-badge inline-expired">Previous event</span>}<p className="lead">{event.description}</p><div className="detail-grid"><div>📅 <b>{formatDate(event.date)}</b><small>{event.start_time} – {event.end_time}</small></div><div>📍 <b>{event.location}</b><small>{event.address}</small></div><div>🎟️ <b>{Number(event.ticket_price) === 0 ? "FREE" : formatMoney(event.ticket_price)}</b><small>Ticket price</small></div><div>👤 <b>{event.organizer_name}</b><small>Organizer</small></div></div></div></div>
    <section className="section reviews-section organizer-event-reviews"><div className="section-head"><div><span className="eyebrow">ATTENDEE FEEDBACK</span><h2>Ratings & reviews ({reviews.length})</h2></div></div>
      <div className="rating-summary"><div className="rating-summary-score"><strong>{reviews.length ? average.toFixed(1) : "—"}</strong><span className="stars">{reviews.length ? "★".repeat(Math.round(average)) + "☆".repeat(5 - Math.round(average)) : "☆☆☆☆☆"}</span><small>{reviews.length ? `Based on ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}` : "No ratings yet"}</small></div><p>{reviews.length ? "Ratings and written feedback shared by attendees." : "Attendee ratings and opinions will appear here after eligible attendees submit their reviews."}</p></div>
      <div className="review-list">{reviews.map((review) => <article className="review-card" key={review.id}><div className="review-head"><b>{review.user_name}</b><span className="stars">{"★".repeat(Number(review.rating))}{"☆".repeat(5 - Number(review.rating))}</span></div><p>{review.comment}</p><small className="muted">{review.created_at ? new Date(review.created_at).toLocaleDateString("en-IN") : ""}</small></article>)}{!reviews.length && <div className="empty">No reviews have been submitted for this event yet.</div>}</div>
    </section>
  </div>;
}
