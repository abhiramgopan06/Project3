import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../helpers";

export default function Reviews({ event, user, canReview, onReviewAdded }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reviews = event.reviews || [];
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await api.post("/events/reviews/", {
        event: event.id,
        rating: rating,
        comment: comment,
      });
      setComment("");
      setRating(5);
      onReviewAdded();
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit your review. Please try again."));
    }

    setSubmitting(false);
  }

  return (
    <div className="section reviews-section">
      <div className="section-head">
        <div>
          <span className="eyebrow">ATTENDEE FEEDBACK</span>
          <h2>Reviews ({reviews.length})</h2>
        </div>
      </div>

      <div className="rating-summary" aria-label="Event rating summary">
        <div className="rating-summary-score">
          <strong>{reviews.length ? averageRating.toFixed(1) : "—"}</strong>
          <span className="stars" aria-label={reviews.length ? `Average rating ${averageRating.toFixed(1)} out of 5` : "No ratings yet"}>
            {reviews.length ? "★".repeat(Math.round(averageRating)) + "☆".repeat(5 - Math.round(averageRating)) : "☆☆☆☆☆"}
          </span>
          <small>{reviews.length ? `Based on ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}` : "No ratings yet"}</small>
        </div>
        <p>{reviews.length ? "Attendee ratings and opinions for this event." : "Ratings and written opinions from attendees will appear here after they submit a review."}</p>
      </div>

      <div className="review-list">
        {reviews.map(function (review) {
          return (
            <div className="review-card" key={review.id}>
              <div className="review-head">
                <b>{review.user_name}</b>
                <span className="stars">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>
              </div>
              <p>{review.comment}</p>
            </div>
          );
        })}

        {reviews.length === 0 && <div className="empty">No reviews yet. Be the first to share your experience.</div>}
      </div>


      {user && canReview && !(event.reviews || []).some((review) => review.user === user.id) ? (
        <form className="panel review-form" onSubmit={handleSubmit}>
          <h3>Write a review</h3>

          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            <option value={5}>★★★★★ (5) Excellent</option>
            <option value={4}>★★★★☆ (4) Good</option>
            <option value={3}>★★★☆☆ (3) Okay</option>
            <option value={2}>★★☆☆☆ (2) Not great</option>
            <option value={1}>★☆☆☆☆ (1) Poor</option>
          </select>

          <textarea
            required
            placeholder="Share your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <button className="btn primary" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit review"}
          </button>

          {error && <div className="error">{error}</div>}
        </form>
      ) : user && (event.reviews || []).some((review) => review.user === user.id) ? (
        <p className="muted">You have already reviewed this event.</p>
      ) : user ? (
        <p className="muted">The “Write a review” option will appear after the organizer marks your booking as attended.</p>
      ) : (
        <p className="muted"><Link to="/login">Log in</Link> to see your review options.</p>
      )}
    </div>
  );
}
