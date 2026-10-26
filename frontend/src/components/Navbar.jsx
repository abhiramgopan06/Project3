import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

export default function Navbar({ user, setUser, theme, toggleTheme }) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let previousScrollY = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const scrollingUp = currentScrollY < previousScrollY;

      if (currentScrollY < 40 || scrollingUp) {
        setIsVisible(true);
      } else if (currentScrollY > 100) {
        setIsVisible(false);
      }

      previousScrollY = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  }

  return (
    <header className={`navbar${isVisible ? " navbar-visible" : " navbar-hidden"}`}>
      <Link className="brand" to="/">
        <span>✦</span> Evently
      </Link>


      <nav aria-label="Main navigation">
        <NavLink to="/">Events</NavLink>
        <NavLink to="/about">About us</NavLink>

        {user && user.role === "organizer" ? (
          <NavLink to="/organizer/booking-events">Booking Events</NavLink>
        ) : user ? (
          <NavLink to="/bookings">My Bookings</NavLink>
        ) : null}

        {user && user.role === "organizer" && <NavLink to="/organizer">Organizer</NavLink>}

        {user && user.role === "attendee" && <NavLink to="/dashboard">Dashboard</NavLink>}

        {user && user.is_staff && <NavLink to="/admin-dashboard">Admin</NavLink>}
      </nav>


      <div className="nav-actions">
        <button
          type="button"
          className="theme-toggle"
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          onClick={toggleTheme}
        >
          {theme === "light" ? "☾" : "☼"}
        </button>

        {user ? (
          <>
            <span className="user-pill">Hi, {user.first_name || user.username}</span>
            <button type="button" className="btn ghost" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="btn ghost" to="/login">
              Login
            </Link>
            <Link className="btn primary" to="/register">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
