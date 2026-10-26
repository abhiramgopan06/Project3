import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="footer-logo" to="/">
            <span>✦</span> Evently
          </Link>
          <p>
            A simple place to discover events, book seats and manage your own events with less work.
          </p>
          <div className="footer-socials">
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>
            </a>
            <a href="https://x.com/" target="_blank" rel="noreferrer" aria-label="X">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 3H22l-6.8 7.8L23.2 21h-6.3L12 14.8 6.6 21H3.4l7.3-8.4L3 3h6.5l4.5 5.9L18.9 3Zm-1.1 16h1.7L8.5 4.9H6.7L17.8 19Z" fill="currentColor"/></svg>
            </a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.1a3 3 0 0 0-2.1-2.2C19 4.4 12 4.4 12 4.4s-7 0-8.9.5A3 3 0 0 0 1 7.1 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.9a3 3 0 0 0 2.1 2.2c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.2 31 31 0 0 0 .5-4.9 31 31 0 0 0-.5-4.9ZM9.6 15.4V8.6l6 3.4-6 3.4Z" fill="currentColor"/></svg>
            </a>
            <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 3.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4ZM3.3 9.5h3.8V21H3.3V9.5Zm6.2 0h3.6v1.6h.1a4 4 0 0 1 3.6-2c3.9 0 4.6 2.5 4.6 5.7V21h-3.8v-5.5c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21H9.5V9.5Z" fill="currentColor"/></svg>
            </a>
          </div>
        </div>

        <div className="footer-section">
          <h3>Explore</h3>
          <Link to="/">Upcoming Events</Link>
          <Link to="/">Event Categories</Link>
          <Link to="/bookings">My Bookings</Link>
          <Link to="/">Discover Events</Link>
        </div>

        <div className="footer-section">
          <h3>For Organizers</h3>
          <Link to="/organizer">Organizer Dashboard</Link>
          <Link to="/organizer">Create an Event</Link>
          <Link to="/organizer">Event Planning</Link>
          <Link to="/organizer">Attendance</Link>
        </div>

        <div className="footer-section">
          <h3>Support</h3>
          <a href="mailto:support@evently.local">Contact Support</a>
          <a href="mailto:support@evently.local">Booking Help</a>
          <a href="mailto:support@evently.local">General Questions</a>
          <span>+91 90610 76083</span>
        </div>
      </div>

      <div className="footer-bottom">
        <div>
          <strong>© 2026 Evently</strong>
          <span>All rights reserved.</span>
        </div>
        <div className="footer-features">
          <span>Easy Booking</span>
          <span>Seat Selection</span>
          <span>Event Planning</span>
        </div>
      </div>
    </footer>
  );
}
