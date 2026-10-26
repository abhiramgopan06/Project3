import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import api from "./api";

import Navbar from "./components/Navbar";
import RequireLogin from "./components/RequireLogin";

import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import PublicOrganizerPage from "./pages/PublicOrganizerPage";
import OrganizerPublishedEventPage from "./pages/OrganizerPublishedEventPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import BookingsPage from "./pages/BookingsPage";
import DashboardPage from "./pages/DashboardPage";
import OrganizerPage from "./pages/OrganizerPage";
import OrganizerHistoryPage from "./pages/OrganizerHistoryPage";
import OrganizerBookingEventsPage from "./pages/OrganizerBookingEventsPage";
import AttendeesPage from "./pages/AttendeesPage";
import AdminPage from "./pages/AdminPage";
import Footer from "./components/Footer";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  useEffect(function () {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me/")
      .then(function (response) {
        setUser(response.data);
      })
      .catch(function () {
        localStorage.removeItem("token");
      })
      .finally(function () {
        setLoading(false);
      });
  }, []);
  useEffect(
    function () {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    },
    [theme]
  );

  function toggleTheme() {
    if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }

  return (
    <div className="app">
      <Navbar user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} />

      <main>
        <Routes>

          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/events/:id" element={<EventDetailsPage user={user} />} />
          <Route path="/organizers/:organizerId" element={<PublicOrganizerPage />} />
          <Route path="/organizer-events/:id" element={<OrganizerPublishedEventPage />} />
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyOtpPage />} />


          <Route
            path="/bookings"
            element={
              <RequireLogin user={user} loading={loading}>
                <BookingsPage user={user} />
              </RequireLogin>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireLogin user={user} loading={loading} role="attendee">
                <DashboardPage />
              </RequireLogin>
            }
          />


          <Route
            path="/organizer"
            element={
              <RequireLogin user={user} loading={loading} role="organizer">
                <OrganizerPage />
              </RequireLogin>
            }
          />
          <Route
            path="/organizer/booking-events"
            element={
              <RequireLogin user={user} loading={loading} role="organizer">
                <OrganizerBookingEventsPage />
              </RequireLogin>
            }
          />
          <Route
            path="/organizer/history"
            element={
              <RequireLogin user={user} loading={loading} role="organizer">
                <OrganizerHistoryPage />
              </RequireLogin>
            }
          />
          <Route
            path="/organizer/events/:id/attendees"
            element={
              <RequireLogin user={user} loading={loading} role="organizer">
                <AttendeesPage />
              </RequireLogin>
            }
          />


          <Route
            path="/admin-dashboard"
            element={
              <RequireLogin user={user} loading={loading} mustBeStaff={true}>
                <AdminPage />
              </RequireLogin>
            }
          />


          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
