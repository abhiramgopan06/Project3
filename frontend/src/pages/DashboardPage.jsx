import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { formatMoney } from "../helpers";
import StatBox from "../components/StatBox";

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(function () {
    api
      .get("/dashboard/")
      .then(function (response) {
        setData(response.data);
      })
      .catch(function () {
        setData({ upcoming_events: 0, attended_events: 0, reviews_to_write: 0, money_spent: 0 });
      });
  }, []);

  return (
    <section className="section attendee-dashboard">
      <span className="eyebrow">YOUR ACTIVITY</span>
      <h1>My Dashboard</h1>
      <p className="lead">Keep track of your event plans, attendance, reviews, and spending.</p>

      {data ? (
        <div className="stats-grid">
          <StatBox label="Upcoming Events" value={data.upcoming_events} icon="📅" />
          <StatBox label="Events Attended" value={data.attended_events} icon="✓" />
          <StatBox label="Reviews to Write" value={data.reviews_to_write} icon="✎" />
          <StatBox label="Money Spent" value={formatMoney(data.money_spent)} icon="₹" />
        </div>
      ) : (
        <div className="empty">Loading your activity...</div>
      )}

      <div className="dashboard-card">
        <h3>What's next?</h3>
        <p>Check your bookings, find an event to attend, or share your experience after an event.</p>
        <div className="dashboard-actions">
          <Link className="btn primary" to="/bookings">View My Bookings</Link>
          <Link className="btn ghost" to="/">Browse Events</Link>
        </div>
      </div>
    </section>
  );
}
