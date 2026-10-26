import os
from datetime import datetime

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from django.contrib.auth.models import User
from accounts.models import Profile
from events.models import Category, Venue, Event, EventImage

categories = {
    "Technology": "Events focused on technology, programming, software, AI, robotics, and emerging technologies.",
    "Music": "Concerts, live performances, acoustic sessions, and musical events.",
    "Sports": "Sporting events, tournaments, competitions, fitness activities, and athletic programs.",
    "Education": "Academic events such as seminars, training programs, lectures, and educational sessions.",
    "Business": "Events for entrepreneurs, professionals, startups, students, and business networking.",
    "Workshops": "Practical learning sessions where participants develop skills through hands-on activities and training.",
    "Conferences": "Professional or academic gatherings featuring speakers, presentations, discussions, and networking.",
    "Entertainment": "Concerts, live performances, shows, comedy programs, and other entertainment events.",
    "Cultural Events": "Events celebrating music, dance, arts, traditions, festivals, and cultural activities.",
    "Other": "Events that do not fit into any of the available categories.",
}

def make_layout(capacity, columns=20):
    rows = max(1, (int(capacity) + columns - 1) // columns)
    layout = []
    remaining = int(capacity)
    for row_index in range(rows):
        label = chr(65 + row_index)
        count = min(columns, remaining)
        layout.append({"row": label, "seats": list(range(1, count + 1))})
        remaining -= count
    return rows, columns, layout

for name, description in categories.items():
    Category.objects.update_or_create(name=name, defaults={"description": description})

venues = [
    {
        "name": "City Convention Hall", "address": "MG Road, Kochi, Kerala", "city": "Kochi",
        "capacity": 500, "description": "A centrally located convention venue suitable for conferences, workshops, seminars, exhibitions, and student events."
    },
    {
        "name": "Marine Convention Centre", "address": "Marine Drive, Kochi, Kerala", "city": "Kochi",
        "capacity": 750, "description": "A modern event venue suitable for conferences, cultural programs, music events, and corporate gatherings."
    },
    {
        "name": "Lulu International Convention Centre", "address": "Edappally, Kochi, Kerala", "city": "Kochi",
        "capacity": 1000, "description": "A large convention venue suitable for business summits, conferences, exhibitions, and networking events."
    },
    {
        "name": "Rajiv Gandhi Sports Stadium", "address": "Kaloor, Kochi, Kerala", "city": "Kochi",
        "capacity": 5000, "description": "A sports venue suitable for football tournaments, athletic programs, and large sporting events."
    },
]
for data in venues:
    Venue.objects.update_or_create(name=data["name"], defaults=data)

user, created = User.objects.get_or_create(
    username="organizer1",
    defaults={"email": "organizer@example.com", "first_name": "Demo", "last_name": "Organizer"},
)
if created:
    user.set_password("student123")
    user.save()
Profile.objects.get_or_create(user=user, defaults={"role": "organizer"})

pending_user, pending_created = User.objects.get_or_create(
    username="organizer2",
    defaults={"email": "organizer2@example.com", "first_name": "Waiting", "last_name": "Organizer"},
)
if pending_created:
    pending_user.set_password("student123")
    pending_user.save()
Profile.objects.get_or_create(user=pending_user, defaults={"role": "organizer", "status": "pending"})

event_data = [
    {
        "title": "Python Full Stack Development Workshop",
        "description": "A beginner-friendly workshop covering the basics of Python, Django, React, and modern web development. Participants will learn how frontend and backend technologies work together and build a simple web application during the session.",
        "category": "Technology", "venue": "City Convention Hall", "date": "2026-10-26",
        "start_time": "10:00", "end_time": "13:00", "location": "Kochi", "address": "MG Road, Kochi, Kerala",
        "ticket_price": 199, "capacity": 100, "registration_deadline": "2026-10-25",
        "image": "events/e-e-1_7kzDYZH.jpg",
        "gallery": ["events/gallery/e-e-1-2.jpg", "events/gallery/e-e-1-3.jpg", "events/gallery/e-e-1-4.jpg"],
    },
    {
        "title": "Kochi Live Music Evening",
        "description": "An entertaining live music evening featuring talented local artists and musicians. Enjoy live performances, acoustic sessions, and a relaxed atmosphere with friends and fellow music lovers.",
        "category": "Music", "venue": "Marine Convention Centre", "date": "2026-10-27",
        "start_time": "18:00", "end_time": "21:30", "location": "Kochi", "address": "Marine Drive, Kochi, Kerala",
        "ticket_price": 499, "capacity": 250, "registration_deadline": "2026-10-26",
        "image": "events/e-e-4-1.jpg",
        "gallery": ["events/gallery/e-e-4-2.jpg", "events/gallery/e-e-3-2.jpg", "events/gallery/e-e-3-3.jpg"],
    },
    {
        "title": "Young Entrepreneurs Business Summit 2026",
        "description": "A business networking event designed for students, aspiring entrepreneurs, and startup enthusiasts. The event includes expert talks, networking opportunities, startup discussions, and practical advice for building a successful business.",
        "category": "Business", "venue": "Lulu International Convention Centre", "date": "2026-10-28",
        "start_time": "09:30", "end_time": "16:00", "location": "Edappally, Kochi", "address": "Edappally, Kochi, Kerala",
        "ticket_price": 299, "capacity": 300, "registration_deadline": "2026-10-27",
        "image": "events/e-e-3-1.jpg",
        "gallery": ["events/gallery/e-e-3-2.jpg", "events/gallery/e-e-3-3.jpg", "events/gallery/e-e-3-4.jpg"],
    },
    {
        "title": "Career Guidance & Skills Development Seminar",
        "description": "A career-focused seminar helping students understand current technology careers, internship opportunities, resume preparation, interview skills, and professional development.",
        "category": "Education", "venue": "City Convention Hall", "date": "2026-10-31",
        "start_time": "10:00", "end_time": "14:00", "location": "Kochi", "address": "MG Road, Kochi, Kerala",
        "ticket_price": 99, "capacity": 200, "registration_deadline": "2026-10-29",
        "image": "events/e-e-2-1.jpg",
        "gallery": ["events/gallery/e-e-2-2.jpg", "events/gallery/e-e-2-3.jpg", "events/gallery/e-e-2-4.jpg"],
    },
    {
        "title": "Kochi Inter-College Football Championship",
        "description": "An exciting inter-college football tournament bringing together college teams for a competitive sporting experience. The event promotes teamwork, sportsmanship, and healthy competition among students.",
        "category": "Sports", "venue": "Rajiv Gandhi Sports Stadium", "date": "2026-11-07",
        "start_time": "08:00", "end_time": "17:00", "location": "Kochi", "address": "Kaloor, Kochi, Kerala",
        "ticket_price": 150, "capacity": 500, "registration_deadline": "2026-11-05",
        "image": "events/e-e-1.jpg",
        "gallery": ["events/gallery/e-e-1-5.jpg", "events/gallery/e-e-4-2.jpg"],
    },
]

for data in event_data:
    category = Category.objects.get(name=data["category"])
    venue = Venue.objects.get(name=data["venue"])
    event, created = Event.objects.get_or_create(
        title=data["title"], organizer=user,
        defaults={
            "description": data["description"], "category": category, "venue": venue,
            "date": data["date"], "start_time": data["start_time"], "end_time": data["end_time"],
            "location": data["location"], "address": data["address"], "ticket_price": data["ticket_price"],
            "capacity": data["capacity"], "available_tickets": data["capacity"],
            "seating_rows": make_layout(data["capacity"])[0], "seats_per_row": 20,
            "seat_layout": make_layout(data["capacity"])[2],
            "registration_deadline": data["registration_deadline"], "status": "approved", "image": data["image"],
        },
    )
    if not created:
        event.date = data["date"]
        event.registration_deadline = data["registration_deadline"]
        if event.status in ["inactive", "ongoing", "completed"] and event.date >= datetime.now().date():
            event.status = "approved"
        event.save(update_fields=["date", "registration_deadline", "status"])
    else:
        for order, image_path in enumerate(data["gallery"]):
            EventImage.objects.get_or_create(event=event, image=image_path, defaults={"order": order})

print("Demo data created/updated.")
print("Organizer login: organizer1 / student123")
print("Pending organizer: organizer2 / student123")
print("Added sample events: " + ", ".join(x["title"] for x in event_data))
