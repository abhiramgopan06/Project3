import { useEffect, useState } from "react";
import api from "../api";
import { formatMoney } from "../helpers";
import StatBox from "./StatBox";

export default function DashboardStats({ title, subtitle }) {
  const [data, setData] = useState(null);

  useEffect(function () {
    api
      .get("/dashboard/")
      .then(function (response) {
        setData(response.data);
      })
      .catch(function () {
      });
  }, []);

  return (
    <div className="section">
      <span className="eyebrow">DASHBOARD</span>
      <h1>{title}</h1>
      <p className="lead">{subtitle}</p>

      {data && (
        <div className="stats-grid">
          <StatBox label="Events" value={data.events} icon="✦" />
          <StatBox label="Bookings" value={data.bookings} icon="🎟️" />
          <StatBox label="Attendees" value={data.attendees} icon="👥" />
          <StatBox label="Revenue" value={formatMoney(data.revenue)} icon="₹" />
        </div>
      )}

      <div className="dashboard-card">
        <h3>How the system works</h3>
        <p>
          Browse an approved event → choose seats → create a booking → complete mock payment → receive a booking
          confirmation.
        </p>
      </div>
    </div>
  );
}
