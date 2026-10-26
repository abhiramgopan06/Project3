import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero section">
        <div className="about-copy">
          <span className="home-section-eyebrow">ABOUT EVENTLY</span>
          <h1>Bringing people together, <span>one event at a time.</span></h1>
          <p>Evently makes it easier to discover experiences, meet your community, and create memories worth sharing. From concerts and creative workshops to professional meetups and local celebrations, we bring event discovery and booking together in one simple place.</p>
          <p>Our goal is to make every step feel clear and welcoming: explore upcoming events, learn what to expect, choose your seats when available, and keep your bookings organised. Event organisers can share their events and manage the details that help guests have a great experience.</p>
          <div className="about-actions">
            <Link className="btn primary" to="/">Explore events</Link>
            <Link className="btn ghost" to="/register">Join Evently</Link>
          </div>
        </div>
        <div className="about-image-wrap">
          <img src="/hero-event.jpg" alt="A warmly lit event space ready to welcome guests" />
          <div className="about-image-note"><span>✦</span><div><strong>Make room for memorable moments</strong><small>Discover something worth looking forward to.</small></div></div>
        </div>
      </section>
      <section className="about-values section">
        <article><span>01</span><h2>Discover</h2><p>Find upcoming experiences by date, category, location, and more.</p></article>
        <article><span>02</span><h2>Connect</h2><p>Explore events that bring friends, neighbours, and communities together.</p></article>
        <article><span>03</span><h2>Experience</h2><p>Keep event details and bookings easy to find from one place.</p></article>
      </section>
    </main>
  );
}
