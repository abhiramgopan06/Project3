import { useEffect, useState } from "react";
import api from "../api";
import { getErrorMessage } from "../helpers";
import EventCard from "../components/EventCard";

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    location: "",
    max_price: "",
    date: "",
  });

  async function loadData(nextFilters = filters) {
    setLoading(true);
    const activeFilters = {};
    for (const name in nextFilters) {
      if (nextFilters[name] !== "") {
        activeFilters[name] = nextFilters[name];
      }
    }

    try {
      const [eventsResponse, categoriesResponse] = await Promise.all([
        api.get("/events/events/", { params: { ...activeFilters, status: "approved" } }),
        api.get("/events/categories/"),
      ]);
      const eventResults = Array.isArray(eventsResponse.data)
        ? eventsResponse.data
        : Array.isArray(eventsResponse.data?.results)
          ? eventsResponse.data.results
          : [];
      const categoryResults = Array.isArray(categoriesResponse.data)
        ? categoriesResponse.data
        : Array.isArray(categoriesResponse.data?.results)
          ? categoriesResponse.data.results
          : [];
      const now = new Date();
      const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
      const upcomingEvents = eventResults.filter(function (event) {
        if (!event.date || event.date < today) {
          return false;
        }
        if (nextFilters.date && event.date !== nextFilters.date) {
          return false;
        }
        if (nextFilters.search) {
          const searchText = (String(event.title || "") + " " + String(event.description || "") + " " + String(event.location || "")).toLowerCase();
          if (!searchText.includes(nextFilters.search.toLowerCase().trim())) {
            return false;
          }
        }
        if (nextFilters.location && !String(event.location || "").toLowerCase().includes(nextFilters.location.toLowerCase().trim())) {
          return false;
        }
        const eventCategory = event.category && typeof event.category === "object"
          ? event.category.id
          : event.category ?? event.category_id ?? "";
        if (nextFilters.category && String(eventCategory) !== String(nextFilters.category)) {
          return false;
        }
        if (nextFilters.max_price !== "" && Number(event.ticket_price || 0) > Number(nextFilters.max_price)) {
          return false;
        }
        return true;
      });
      setEvents(upcomingEvents);
      setCategories(categoryResults);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not load events. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(function () {
    loadData();
  }, []);

  function handleFilterChange(e) {
    const name = e.target.name;
    const value = e.target.value;
    setFilters(function (currentFilters) {
      return { ...currentFilters, [name]: value };
    });
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadData();
    document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
  }

  function clearFilters() {
    const emptyFilters = { search: "", category: "", location: "", max_price: "", date: "" };
    setFilters(emptyFilters);
    loadData(emptyFilters);
  }

  const featuredEvents = events.slice(0, 8);

  return (
    <main className="home-page">
      <section className="home-hero">
        <img className="home-hero-image" src="/hero-event.jpg" alt="People enjoying a live event" />
        <div className="home-hero-shade" />
        <div className="home-hero-topline">
          <nav className="home-quick-nav" aria-label="Home page navigation">
            <a className="is-current" href="/">Home</a>
            <a href="#events">Events</a>
            <a href="#categories">Categories</a>
            <a href="#discover">Discover</a>
            <a href="/about">About us</a>
          </nav>
        </div>

        <div className="home-hero-copy">
          <span className="home-kicker">MAKE EVERY MOMENT COUNT</span>
          <h1>Your Gateway to <span>Festivals &amp; Events</span></h1>
          <p>From live music and creative workshops to local meetups, discover experiences worth remembering.</p>
        </div>

        <form className="home-search-panel" onSubmit={handleSearchSubmit}>
          <label className="home-search-field">
            <span className="home-search-icon date-icon">▦</span>
            <span className="home-search-field-content">
              <strong>Date and time</strong>
              <input name="date" type="date" value={filters.date} onChange={handleFilterChange} aria-label="Event date" />
            </span>
          </label>
          <label className="home-search-field">
            <span className="home-search-icon location-icon">⌖</span>
            <span className="home-search-field-content">
              <strong>Location</strong>
              <input name="location" placeholder="Any location" value={filters.location} onChange={handleFilterChange} />
            </span>
          </label>
          <label className="home-search-field">
            <span className="home-search-icon category-icon">▦</span>
            <span className="home-search-field-content">
              <strong>Category</strong>
              <select name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All events</option>
                {categories.map(function (category) {
                  return <option key={category.id} value={category.id}>{category.name}</option>;
                })}
              </select>
            </span>
          </label>
          <button className="home-search-button" type="submit"><span>⌕</span> Search</button>
        </form>
      </section>

      <section className="home-featured section" id="events">
        <div className="home-section-heading">
          <div>
            <span className="home-section-eyebrow">FIND YOUR NEXT EXPERIENCE</span>
            <h2>Upcoming events <span>near you</span></h2>
          </div>
          <a href="#discover" className="home-view-more">View all <span>›</span></a>
        </div>

        <form className="home-refine-search" onSubmit={handleSearchSubmit}>
          <label className="home-refine-input"><span>⌕</span><input name="search" placeholder="Search events, workshops, concerts..." value={filters.search} onChange={handleFilterChange} /></label>
          <input name="max_price" type="number" min="0" placeholder="Maximum price" value={filters.max_price} onChange={handleFilterChange} aria-label="Maximum price" />
          <button type="submit" className="btn primary">Find events</button>
          <button type="button" className="home-clear-button" onClick={clearFilters}>Clear</button>
        </form>

        {errorMessage && <div className="error">{errorMessage}</div>}
        {loading ? (
          <div className="home-loading" role="status">Finding exciting events for you…</div>
        ) : events.length > 0 ? (
          <div className="home-event-rail">
            {featuredEvents.map(function (event) {
              return <EventCard key={event.id} event={event} />;
            })}
          </div>
        ) : (
          <div className="home-empty-state">
            <span>✦</span>
            <h3>No upcoming events found</h3>
            <p>Try another date or clear your filters to discover more experiences.</p>
            <button type="button" className="btn primary" onClick={clearFilters}>Clear filters</button>
          </div>
        )}
      </section>

      <section className="home-category-section" id="categories">
        <div className="section home-category-inner">
          <div className="home-section-heading">
            <div>
              <span className="home-section-eyebrow">EXPLORE SOMETHING NEW</span>
              <h2>Browse by <span>category</span></h2>
            </div>
          </div>
          <div className="home-category-list">
            {categories.slice(0, 8).map(function (category, index) {
              const symbols = ["♫", "✦", "⌘", "◈", "⚽", "☼", "▤", "✧"];
              return (
                <button key={category.id} type="button" className="home-category-chip" onClick={function () {
                  const nextFilters = { ...filters, category: String(category.id) };
                  setFilters(nextFilters);
                  loadData(nextFilters);
                  document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
                }}>
                  <span>{symbols[index % symbols.length]}</span>{category.name}<b>↗</b>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="home-discover-section section" id="discover">
        <div className="home-discover-card">
          <div>
            <span className="home-section-eyebrow">YOUR NEXT STORY STARTS HERE</span>
            <h2>Make room for<br />memorable moments.</h2>
            <p>Find events you love, book your place, and bring your people along.</p>
          </div>
          <a href="#events" className="home-discover-cta">Explore events <span>→</span></a>
          <div className="home-discover-orb" aria-hidden="true">✦</div>
        </div>
      </section>
    </main>
  );
}
