import { Link } from "react-router-dom";
import { formatMoney } from "../helpers";

export default function EventCard({ event }) {
  const dateText = new Date(event.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
  const description = event.description || "Discover the details of this upcoming event.";
  let shortDescription = description.slice(0, 95);
  if (description.length > 95) {
    shortDescription = shortDescription + "...";
  }
  let imageUrl = event.image_url;
  if (!imageUrl && event.images && event.images.length > 0) {
    imageUrl = event.images[0].image_url;
  }

  return (
    <Link to={"/events/" + event.id} className="event-card">
      <div className="event-image">
        {imageUrl ? <img src={imageUrl} alt={event.title} /> : <div className="image-placeholder">✦</div>}

        <span className="date-badge">{dateText}</span>


        {event.status !== "approved" && (
          <span className={"status " + event.status + " card-status-badge"}>{event.status}</span>
        )}
      </div>

      <div className="event-body">
        <span className="tag">{event.category_name || "Event"}</span>
        <h3>{event.title}</h3>
        <p>{shortDescription}</p>
        <div className="event-meta">
          <span>📍 {event.location}</span>
          <b>{Number(event.ticket_price) === 0 ? "FREE" : formatMoney(event.ticket_price)}</b>
        </div>
      </div>
    </Link>
  );
}
