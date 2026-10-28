import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { formatDate, formatMoney, getErrorMessage } from "../helpers";
import ImageGallery from "../components/ImageGallery";
import SeatMap from "../components/SeatMap";

export default function EventDetailsPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");
  const [seatMap, setSeatMap] = useState(null);
  const [seatMapError, setSeatMapError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [message, setMessage] = useState("");
  const [pendingBooking, setPendingBooking] = useState(null);
  const [clock, setClock] = useState(Date.now());
  const [paying, setPaying] = useState(false);

  async function loadEvent() {
    setEventLoading(true);
    setEventError("");
    try {
      const response = await api.get("/events/events/" + id + "/");
      setEvent(response.data);
    } catch (error) {
      setEvent(null);
      setEventError(getErrorMessage(error, "Could not load this event. Please return to the events page and try again."));
    } finally {
      setEventLoading(false);
    }
  }

  async function loadSeatMap() {
    try {
      const response = await api.get("/bookings/seat-map/" + id + "/");
      setSeatMap(response.data);
      setSeatMapError("");
    } catch (error) {
      setSeatMapError("Could not load the seating plan. Please refresh and try again.");
    }
  }
  useEffect(
    function () {
      setSelectedSeats([]);
      setEvent(null);
      setSeatMap(null);
      setMessage("");
      setPendingBooking(null);
      loadEvent();
      loadSeatMap();
    },
    [id, user]
  );

  useEffect(function () {
    const timer = window.setInterval(function () {
      setClock(Date.now());
    }, 1000);
    return function () {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(function () {
    const refreshSeats = window.setInterval(async function () {
      try {
        const response = await api.get("/bookings/seat-map/" + id + "/");
        setSeatMap(response.data);
        setSeatMapError("");
      } catch (error) {
        setSeatMapError("Could not refresh the seating plan. Please try again.");
      }
    }, 15000);
    return function () {
      window.clearInterval(refreshSeats);
    };
  }, [id]);

  if (eventLoading) {
    return <div className="empty" role="status">Loading event information...</div>;
  }

  if (!event) {
    return (
      <section className="section">
        <div className="empty" role="alert">
          <h2>Event unavailable</h2>
          <p>{eventError || "This event could not be found."}</p>
          <Link className="btn primary" to="/">Back to events</Link>
        </div>
      </section>
    );
  }
  function handleSeatClick(seat) {
    if (selectedSeats.includes(seat.id)) {
      setSelectedSeats(
        selectedSeats.filter(function (seatId) {
          return seatId !== seat.id;
        })
      );
    } else if (selectedSeats.length < event.available_tickets) {
      setSelectedSeats([...selectedSeats, seat.id]);
    } else {
      setMessage("Only " + event.available_tickets + " ticket(s) remain available.");
    }
  }

  async function handleBooking() {
    if (!user) {
      navigate("/login");
      return;
    }

    if (selectedSeats.length === 0) {
      setMessage("Please select at least one available seat on the seating plan.");
      return;
    }

    try {
      const response = await api.post("/bookings/bookings/", {
        event: event.id,
        ticket_quantity: selectedSeats.length,
        seat_ids: selectedSeats,
      });

      if (response.data.status === "confirmed") {
        setMessage("Registration confirmed!");
      } else {
        setPendingBooking(response.data);
        setMessage("Your seats are held for 15 minutes. Complete the mock payment below to confirm your booking.");
      }

      setSelectedSeats([]);
      loadEvent();
      loadSeatMap();
    } catch (error) {
      loadSeatMap();
      setMessage(getErrorMessage(error, "Booking failed. Please try again."));
    }
  }

  async function handleMockPayment() {
    if (!pendingBooking) return;
    setPaying(true);
    try {
      await api.post("/bookings/bookings/" + pendingBooking.id + "/pay/");
      setPendingBooking(null);
      setMessage("Mock payment successful. Your booking is confirmed!");
      await loadEvent();
      await loadSeatMap();
    } catch (error) {
      setMessage(getErrorMessage(error, "Mock payment could not be completed. Please check your booking."));
      await loadSeatMap();
    } finally {
      setPaying(false);
    }
  }

  let paymentCountdown = "15:00";
  if (pendingBooking && pendingBooking.booked_at) {
    const deadline = new Date(pendingBooking.booked_at).getTime() + 15 * 60 * 1000;
    const secondsLeft = Math.max(0, Math.floor((deadline - clock) / 1000));
    paymentCountdown = String(Math.floor(secondsLeft / 60)).padStart(2, "0") + ":" + String(secondsLeft % 60).padStart(2, "0");
  }

  const isFree = Number(event.ticket_price) === 0;
  const galleryImages = [];
  if (event.image_url) {
    galleryImages.push({ id: "cover", image_url: event.image_url });
  }
  if (event.images) {
    for (const image of event.images) {
      galleryImages.push(image);
    }
  }
  let availableCount = event.available_tickets;
  if (seatMap) {
    availableCount = seatMap.seats.filter(function (seat) {
      return seat.status === "available";
    }).length;
  }
  let selectedSeatNames = "None";
  if (seatMap && selectedSeats.length > 0) {
    selectedSeatNames = seatMap.seats
      .filter(function (seat) {
        return selectedSeats.includes(seat.id);
      })
      .map(function (seat) {
        return seat.label;
      })
      .join(", ");
  }
  let buttonText = "Book " + (selectedSeats.length || "Selected") + " Seat" + (selectedSeats.length === 1 ? "" : "s");
  if (isFree) {
    buttonText = "Register Selected Seats";
  }

  return (
    <div className="details section">
      <Link className="back" to="/">
        ← Back to events
      </Link>

      <div className="detail-layout">
        <ImageGallery images={galleryImages} />

        <div className="detail-info">
          <span className="tag">{event.category_name}</span>
          <h1>{event.title}</h1>
          <p className="lead">{event.description}</p>

          <div className="detail-grid">
            <div>
              <span className="detail-item-icon" aria-hidden="true">⌖</span>
              <b>{event.location}</b>
              <small>{event.address || "Venue details will be provided by the organizer."}</small>
            </div>
            <div>
              <span className="detail-item-icon" aria-hidden="true">♧</span>
              <b>{event.available_tickets} seats available</b>
              <small>Event capacity: {event.capacity}</small>
            </div>
            <div>
              <span className="detail-item-icon" aria-hidden="true">♙</span>
              <b>{event.organizer_name}</b>
              <small>Event organizer</small>
            </div>
          </div>
          <Link className="organizer-profile-button" to={"/organizers/" + event.organizer}>
            <span className="organizer-profile-icon">✦</span>
            <span><small>DISCOVER MORE EVENTS BY</small><strong>{event.organizer_name || "Event Organizer"}</strong></span>
            <span className="organizer-profile-arrow">→</span>
          </Link>

          <section className="event-date-section" aria-label="Event date and calendar">
            <div className="event-date-section-heading">
              <span className="eyebrow">SAVE THE DATE</span>
              <h2>Event date and time</h2>
              <p>Check the calendar to see exactly when this event takes place.</p>
            </div>
            <div className="event-calendar-card event-calendar-full">
              <div className="event-mini-calendar" aria-label={"Calendar for " + formatDate(event.date)}>
                <div className="event-mini-calendar-heading">
                  {new Date(event.date + "T12:00:00").toLocaleDateString("en", { month: "long", year: "numeric" })}
                </div>
                <div className="event-mini-calendar-grid event-mini-calendar-weekdays">
                  { ["S", "M", "T", "W", "T", "F", "S"].map(function (day, index) { return <span key={day + index}>{day}</span>; }) }
                </div>
                <div className="event-mini-calendar-grid">
                  {Array.from({ length: new Date(new Date(event.date + "T12:00:00").getFullYear(), new Date(event.date + "T12:00:00").getMonth(), 1).getDay() }, function (_, index) { return <span className="is-blank" key={"blank-" + index} />; })}
                  {Array.from({ length: new Date(new Date(event.date + "T12:00:00").getFullYear(), new Date(event.date + "T12:00:00").getMonth() + 1, 0).getDate() }, function (_, index) {
                    const dayNumber = index + 1;
                    const isEventDay = dayNumber === new Date(event.date + "T12:00:00").getDate();
                    return <span className={isEventDay ? "is-event-day" : ""} key={dayNumber}>{dayNumber}</span>;
                  })}
                </div>
              </div>
              <div className="event-calendar-content">
                <b>Event date</b>
                <span>{formatDate(event.date)}</span>
                <small>{event.start_time} – {event.end_time}</small>
                <small className="event-calendar-note">Highlighted date is your event day.</small>
              </div>
            </div>
          </section>

        </div>
      </div>



      <section className="seat-selection" aria-label="Choose seats">
            <div className="seat-section-heading">
              <div>
                <span className="eyebrow">SEAT SELECTION</span>
                <h2>Choose your seats</h2>
                <p>Select the exact seats you want. Seats marked booked cannot be selected.</p>
              </div>
              <span className="seat-capacity">{availableCount} available</span>
            </div>

            {seatMapError && <div className="error">{seatMapError}</div>}
            {!seatMap && !seatMapError && <div className="empty">Loading seating plan...</div>}

            {seatMap && (
              <>
                <SeatMap seats={seatMap.seats} selectedSeats={selectedSeats} onSeatClick={handleSeatClick} />

                <div className="seat-summary">
                  <div>
                    <small>Selected seats</small>
                    <strong>{selectedSeatNames}</strong>
                  </div>
                  <div>
                    <small>Tickets</small>
                    <strong>{selectedSeats.length}</strong>
                  </div>
                  <div>
                    <small>Total</small>
                    <strong>{isFree ? "FREE" : formatMoney(Number(event.ticket_price) * selectedSeats.length)}</strong>
                  </div>
                </div>
              </>
            )}

            <div className="booking-box">
              <div>
                <small>Price per seat</small>
                <strong>{isFree ? "FREE" : formatMoney(event.ticket_price)}</strong>
              </div>
              <button
                className="btn primary"
                disabled={!event.available_tickets || (user && (selectedSeats.length === 0 || !seatMap))}
                onClick={handleBooking}
              >
                {user ? buttonText : "Log in to book seats"}
              </button>
            </div>
            {pendingBooking && (
              <div className="mock-payment-panel">
                <div className="mock-payment-copy">
                  <span className="eyebrow">SECURE YOUR SEATS</span>
                  <h3>Complete mock payment</h3>
                  <p>Your selected seats are held for 15 minutes while payment is pending. Other attendees cannot select these seats. Pay before the countdown ends to confirm your booking.</p>
                  <small className={paymentCountdown === "00:00" ? "payment-timer expired" : "payment-timer"}>
                    {paymentCountdown === "00:00" ? "Payment time expired" : "Complete payment within " + paymentCountdown}
                  </small>
                </div>
                <button className="btn primary mock-pay-button" onClick={handleMockPayment} disabled={paying || paymentCountdown === "00:00"}>
                  {paying ? "Processing mock payment..." : "Pay " + formatMoney(pendingBooking.total_amount) + " · Mock Pay"}
                </button>
              </div>
            )}
          </section>

      {message && <div className="notice" role="status">{message}</div>}

    </div>
  );
}
