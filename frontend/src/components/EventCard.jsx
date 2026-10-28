import { Link } from "react-router-dom";
import { formatMoney } from "../helpers";

export default function EventCard({ event, user, isFavorite = false, onToggleFavorite }) {
  const dateText = new Date(event.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const description = event.description || "Discover the details of this upcoming event.";
  const shortDescription = description.length > 95 ? description.slice(0, 95) + "..." : description;
  let imageUrl = event.image_url;
  if (!imageUrl && event.images && event.images.length > 0) imageUrl = event.images[0].image_url;

  return (
    <article className="event-card">
      <Link to={"/events/" + event.id} className="event-card-link">
        <div className="event-image">
          {imageUrl ? <img src={imageUrl} alt={event.title} loading="lazy" /> : <div className="image-placeholder">✦</div>}
          <span className="date-badge">{dateText}</span>
          {event.status !== "approved" && <span className={"status " + event.status + " card-status-badge"}>{event.status}</span>}
        </div>
        <div className="event-body">
          <span className="tag">{event.category_name || "Event"}</span>
          <h3>{event.title}</h3>
          <p>{shortDescription}</p>
          <div className="event-meta"><span>📍 {event.location}</span><b>{Number(event.ticket_price) === 0 ? "FREE" : formatMoney(event.ticket_price)}</b></div>
        </div>
      </Link>
      {user && user.role === "attendee" && <button type="button" className={"event-favorite-button" + (isFavorite ? " active" : "")} aria-label={isFavorite ? "Remove from saved events" : "Save event"} title={isFavorite ? "Remove from saved events" : "Save event"} onClick={function (clickEvent) { clickEvent.preventDefault(); clickEvent.stopPropagation(); onToggleFavorite?.(event.id); }}>{isFavorite ? "♥" : "♡"}</button>}
    </article>
  );
}
