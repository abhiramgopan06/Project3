import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { getErrorMessage } from "../helpers";
import GalleryManager from "../components/GalleryManager";
import PlanningHub from "../components/PlanningHub";
import SeatArrangementEditor from "../components/SeatArrangementEditor";
const EMPTY_FORM = {
  title: "",
  description: "",
  date: "",
  start_time: "10:00",
  end_time: "12:00",
  location: "",
  address: "",
  ticket_price: 0,
  seat_count: 100,
  seating_rows: 5,
  seats_per_row: 20,
  seat_layout: Array.from({ length: 5 }, function (_, index) {
    return { row: String.fromCharCode(65 + index), seats: Array.from({ length: 20 }, function (_, seat) { return seat + 1; }) };
  }),
  image: null,
  category: "",
  venue: "",
};

const EMPTY_CATEGORY = { name: "", description: "" };
const EMPTY_VENUE = { name: "", city: "", address: "", capacity: "", description: "" };

export default function OrganizerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [galleryPicks, setGalleryPicks] = useState([]);
  const [galleryRefresh, setGalleryRefresh] = useState(0);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState(EMPTY_CATEGORY);
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [newVenue, setNewVenue] = useState(EMPTY_VENUE);

  async function loadMyEvents() {
    const response = await api.get("/events/events/mine/");
    setEvents(response.data);
  }

  async function loadCategoriesAndVenues() {
    const categoriesResponse = await api.get("/events/categories/");
    setCategories(categoriesResponse.data);

    const venuesResponse = await api.get("/events/venues/");
    setVenues(venuesResponse.data);
  }

  useEffect(function () {
    loadMyEvents();
    loadCategoriesAndVenues();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleNewCategoryChange(e) {
    setNewCategory({ ...newCategory, [e.target.name]: e.target.value });
  }

  function handleNewVenueChange(e) {
    setNewVenue({ ...newVenue, [e.target.name]: e.target.value });
  }

  async function handleSaveCategory() {
    try {
      const response = await api.post("/events/categories/", newCategory);
      setCategories([...categories, response.data]);
      setForm({ ...form, category: response.data.id });
      setNewCategory(EMPTY_CATEGORY);
      setShowNewCategory(false);
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not add that category."));
    }
  }

  async function handleSaveVenue() {
    try {
      const data = { ...newVenue };
      if (!data.capacity) {
        delete data.capacity;
      }

      const response = await api.post("/events/venues/", data);
      setVenues([...venues, response.data]);
      setForm({ ...form, venue: response.data.id });
      setNewVenue(EMPTY_VENUE);
      setShowNewVenue(false);
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not add that venue."));
    }
  }

  function handleGalleryPick(e) {
    const files = Array.from(e.target.files);

    const newPicks = files.map(function (file) {
      return { file: file, previewUrl: URL.createObjectURL(file) };
    });
    setGalleryPicks([...galleryPicks, ...newPicks]);

    e.target.value = "";
  }

  function removeGalleryPick(index) {
    URL.revokeObjectURL(galleryPicks[index].previewUrl);
    setGalleryPicks(
      galleryPicks.filter(function (pick, i) {
        return i !== index;
      })
    );
  }

  function clearGalleryPicks() {
    for (const pick of galleryPicks) {
      URL.revokeObjectURL(pick.previewUrl);
    }
    setGalleryPicks([]);
  }
  async function uploadGalleryPhotos(eventId) {
    let failed = 0;
    for (const pick of galleryPicks) {
      const data = new FormData();
      data.append("event", eventId);
      data.append("image", pick.file);
      try {
        await api.post("/events/event-images/", data);
      } catch (error) {
        failed = failed + 1;
      }
    }
    return failed;
  }
  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setCurrentImageUrl("");
    clearGalleryPicks();
    setCoverInputKey(coverInputKey + 1);
  }

  function handleSeatingChange(next) {
    setForm({
      ...form,
      seat_count: next.count,
      seating_rows: next.rows,
      seats_per_row: next.columns,
      seat_layout: next.layout,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData();
    data.append("title", form.title);
    data.append("description", form.description);
    data.append("date", form.date);
    data.append("start_time", form.start_time);
    data.append("end_time", form.end_time);
    data.append("location", form.location);
    data.append("address", form.address);
    data.append("ticket_price", form.ticket_price);
    data.append("seating_rows", form.seating_rows);
    data.append("seats_per_row", form.seats_per_row);
    data.append("seat_layout", JSON.stringify(form.seat_layout));
    data.append("capacity", form.seat_count);
    if (form.category) {
      data.append("category", form.category);
    }
    if (form.venue) {
      data.append("venue", form.venue);
    }
    if (form.image) {
      data.append("image", form.image);
    }

    setSaving(true);

    try {
      let savedEventId = editingId;

      if (editingId) {
        await api.patch("/events/events/" + editingId + "/", data);
      } else {
        const response = await api.post("/events/events/", data);
        savedEventId = response.data.id;
      }

      const failedPhotos = await uploadGalleryPhotos(savedEventId);

      let successMessage = "Event created and sent for admin approval.";
      if (editingId) {
        successMessage = "Event updated.";
      }
      if (failedPhotos > 0) {
        successMessage =
          successMessage +
          " But " +
          failedPhotos +
          " gallery photo(s) could not be uploaded. Click Edit on the event to add them again.";
      }
      setMessage(successMessage);

      resetForm();
      setGalleryRefresh(galleryRefresh + 1);
      loadMyEvents();
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not save event. Please check the form and try again."));
    }

    setSaving(false);
  }
  function startEditing(event) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      address: event.address,
      ticket_price: event.ticket_price,
      seat_count: event.capacity,
      seating_rows: event.seating_rows || Math.max(1, Math.ceil(event.capacity / 20)),
      seats_per_row: event.seats_per_row || 20,
      seat_layout: event.seat_layout || [],
      image: null,
      category: event.category || "",
      venue: event.venue || "",
    });
    setCurrentImageUrl(event.image_url || "");
    clearGalleryPicks();
    setCoverInputKey(coverInputKey + 1);
    setMessage("");
  }

  async function handleDelete(eventId) {
    const sure = window.confirm("Delete this event? This cannot be undone.");
    if (!sure) {
      return;
    }

    try {
      await api.delete("/events/events/" + eventId + "/");
      setMessage("Event deleted.");
      if (editingId === eventId) {
        resetForm();
      }
      loadMyEvents();
    } catch (error) {
      setMessage(getErrorMessage(error, "Could not delete this event."));
    }
  }

  useEffect(function () {
    const params = new URLSearchParams(location.search);
    const editId = params.get("edit");
    if (!editId || events.length === 0) {
      return;
    }

    const event = events.find(function (item) {
      return String(item.id) === String(editId);
    });
    if (event) {
      startEditing(event);
      navigate("/organizer", { replace: true });
    }
  }, [events, location.search]);

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <span className="eyebrow">ORGANIZER AREA</span>
          <h1>Manage your events</h1>
          <p className="lead">Create an event. Admin can approve it before it appears publicly. Expired events stay in your history.</p>
        </div>
      </div>

      <div className="organizer-layout organizer-form-only">
        <form className="panel" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit event" : "Create event"}</h2>

          <input name="title" required placeholder="Event title" value={form.title} onChange={handleChange} />

          <textarea
            name="description"
            required
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
          />


          <div className="image-field">
            <label className="field-label">Event photo</label>

            {currentImageUrl && !form.image && (
              <img src={currentImageUrl} alt="Current event" className="image-preview" />
            )}

            <input
              key={coverInputKey}
              type="file"
              accept="image/*"
              onChange={(e) => setForm({ ...form, image: e.target.files[0] || null })}
            />
          </div>


          <div className="image-field">
            <label className="field-label">More photos (gallery)</label>

            {editingId && <GalleryManager eventId={editingId} showUploader={false} refreshKey={galleryRefresh} />}

            {galleryPicks.length > 0 && (
              <div className="gallery-thumbs">
                {galleryPicks.map(function (pick, index) {
                  return (
                    <div className="gallery-thumb" key={pick.previewUrl}>
                      <img src={pick.previewUrl} alt="Picked photo" />
                      <button
                        type="button"
                        className="gallery-thumb-remove"
                        title="Remove this photo"
                        onClick={() => removeGalleryPick(index)}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <input type="file" accept="image/*" multiple onChange={handleGalleryPick} />
            <p className="hint">You can select many photos at once. They are uploaded when you save the event.</p>
          </div>


          <div className="two">
            <div className="image-field">
              <label className="field-label">Category</label>
              <select name="category" value={form.category} onChange={handleChange}>
                <option value="">No category</option>
                {categories.map(function (category) {
                  return (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  );
                })}
              </select>
              <button type="button" className="btn ghost small" onClick={() => setShowNewCategory(!showNewCategory)}>
                {showNewCategory ? "Cancel" : "+ Add new category"}
              </button>
            </div>

            <div className="image-field">
              <label className="field-label">Venue</label>
              <select name="venue" value={form.venue} onChange={handleChange}>
                <option value="">No venue</option>
                {venues.map(function (venue) {
                  return (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}, {venue.city}
                    </option>
                  );
                })}
              </select>
              <button type="button" className="btn ghost small" onClick={() => setShowNewVenue(!showNewVenue)}>
                {showNewVenue ? "Cancel" : "+ Add new venue"}
              </button>
            </div>
          </div>


          {showNewCategory && (
            <>
              <div className="two">
                <input
                  name="name"
                  required
                  placeholder="New category name"
                  value={newCategory.name}
                  onChange={handleNewCategoryChange}
                />
                <button type="button" className="btn ghost wide" onClick={handleSaveCategory}>
                  Save category
                </button>
              </div>
              <textarea
                name="description"
                placeholder="Category description (optional)"
                rows="2"
                value={newCategory.description}
                onChange={handleNewCategoryChange}
              />
            </>
          )}


          {showNewVenue && (
            <>
              <div className="two">
                <input
                  name="name"
                  required
                  placeholder="Venue name"
                  value={newVenue.name}
                  onChange={handleNewVenueChange}
                />
                <input name="city" required placeholder="City" value={newVenue.city} onChange={handleNewVenueChange} />
              </div>
              <div className="two">
                <input
                  name="address"
                  placeholder="Venue address"
                  value={newVenue.address}
                  onChange={handleNewVenueChange}
                />
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  placeholder="Capacity (default 100)"
                  value={newVenue.capacity}
                  onChange={handleNewVenueChange}
                />
              </div>
              <div className="two">
                <textarea
                  name="description"
                  placeholder="Venue description (optional)"
                  rows="2"
                  value={newVenue.description}
                  onChange={handleNewVenueChange}
                />
                <button type="button" className="btn ghost wide" onClick={handleSaveVenue}>
                  Save venue
                </button>
              </div>
            </>
          )}


          <div className="two">
            <input name="date" required type="date" value={form.date} onChange={handleChange} />
            <input name="location" required placeholder="Location" value={form.location} onChange={handleChange} />
          </div>

          <input name="address" placeholder="Address" value={form.address} onChange={handleChange} />

          <div className="two">
            <input
              name="ticket_price"
              type="number"
              min="0"
              placeholder="Ticket price"
              value={form.ticket_price}
              onChange={handleChange}
            />
          </div>

          <div className="two">
            <input name="start_time" type="time" value={form.start_time} onChange={handleChange} />
            <input name="end_time" type="time" value={form.end_time} onChange={handleChange} />
          </div>


          <SeatArrangementEditor
            rows={form.seating_rows}
            seatsPerRow={form.seats_per_row}
            seatCount={form.seat_count}
            layout={form.seat_layout}
            onChange={handleSeatingChange}
          />

          {editingId ? (
            <div className="two">
              <button className="btn primary wide" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button type="button" className="btn ghost wide" onClick={resetForm}>
                Cancel edit
              </button>
            </div>
          ) : (
            <button className="btn primary wide" disabled={saving}>
              {saving ? "Saving..." : "Create Event"}
            </button>
          )}

          {message && <div className="notice">{message}</div>}
        </form>


      </div>

      <PlanningHub events={events} />
    </div>
  );
}
