import io
import tempfile
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import Profile
from .models import Category, Event, EventImage, Review
from bookings.models import Booking

TEMP_MEDIA = tempfile.mkdtemp()

TOMORROW = str(date.today() + timedelta(days=1))


def make_photo(name="photo.jpg"):
    buffer = io.BytesIO()
    Image.new("RGB", (10, 10), "red").save(buffer, "JPEG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


def register(username, role="attendee"):
    client = APIClient()
    client.post(
        "/api/auth/register/",
        {
            "username": username,
            "email": username + "@example.com",
            "password": "secret123",
            "role": role,
        },
        format="json",
    )




    User.objects.filter(username=username).update(is_active=True)
    Profile.objects.filter(user__username=username).update(email_verified=True, status="approved")

    response = client.post(
        "/api/auth/login/",
        {"username": username, "password": "secret123"},
        format="json",
    )

    client.credentials(HTTP_AUTHORIZATION="Token " + response.data["token"])
    return client, response.data["user"]["id"]


def event_form(**changes):
    data = {
        "title": "Test Event",
        "description": "Something fun",
        "date": TOMORROW,
        "start_time": "10:00",
        "end_time": "12:00",
        "location": "Kochi",
        "ticket_price": "100",
        "capacity": 5,
    }
    data.update(changes)
    return data



@override_settings(
    MEDIA_ROOT=TEMP_MEDIA,
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
)
class EventApiTests(TestCase):
    def setUp(self):
        self.anonymous = APIClient()
        self.organizer, self.organizer_id = register("organizer1", "organizer")
        self.other_organizer, _ = register("organizer2", "organizer")
        self.attendee, _ = register("attendee1")
        self.other_attendee, _ = register("attendee2")

        admin_user = User.objects.create_superuser("admin1", "a@example.com", "secret123")
        self.admin = APIClient()
        self.admin.force_authenticate(admin_user)

    def make_approved_event(self, **changes):
        response = self.organizer.post(
            "/api/events/events/", event_form(**changes), format="multipart"
        )
        self.assertEqual(response.status_code, 201, response.data)
        event_id = response.data["id"]
        self.admin.post("/api/events/events/%d/approve/" % event_id)
        return event_id


    def test_organizer_can_create_event_with_cover_and_gallery_photos(self):
        data = event_form(image=make_photo("cover.jpg"))
        response = self.organizer.post("/api/events/events/", data, format="multipart")
        self.assertEqual(response.status_code, 201)
        event_id = response.data["id"]

        for name in ["one.jpg", "two.jpg", "three.jpg"]:
            photo = self.organizer.post(
                "/api/events/event-images/",
                {"event": event_id, "image": make_photo(name)},
                format="multipart",
            )
            self.assertEqual(photo.status_code, 201)
        self.assertEqual(EventImage.objects.filter(event_id=event_id).count(), 3)

    def test_only_the_owner_can_add_gallery_photos(self):
        event_id = self.make_approved_event()
        response = self.other_organizer.post(
            "/api/events/event-images/",
            {"event": event_id, "image": make_photo()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 403)

    def test_attendee_cannot_create_event(self):
        response = self.attendee.post("/api/events/events/", event_form(), format="multipart")
        self.assertEqual(response.status_code, 403)


    def test_nobody_can_edit_a_gallery_photo(self):
        event_id = self.make_approved_event()
        photo = self.organizer.post(
            "/api/events/event-images/",
            {"event": event_id, "image": make_photo()},
            format="multipart",
        )
        url = "/api/events/event-images/%d/" % photo.data["id"]

        for client in [self.anonymous, self.organizer]:
            response = client.patch(url, {"image": make_photo("evil.jpg")}, format="multipart")
            self.assertEqual(response.status_code, 405)

    def test_only_owner_can_delete_a_gallery_photo(self):
        event_id = self.make_approved_event()
        photo = self.organizer.post(
            "/api/events/event-images/",
            {"event": event_id, "image": make_photo()},
            format="multipart",
        )
        url = "/api/events/event-images/%d/" % photo.data["id"]
        self.assertEqual(self.attendee.delete(url).status_code, 403)
        self.assertEqual(self.organizer.delete(url).status_code, 204)

    def test_photos_of_a_pending_event_are_private(self):
        response = self.organizer.post("/api/events/events/", event_form(), format="multipart")
        event_id = response.data["id"]
        self.organizer.post(
            "/api/events/event-images/",
            {"event": event_id, "image": make_photo()},
            format="multipart",
        )
        url = "/api/events/event-images/?event=%d" % event_id
        self.assertEqual(len(self.anonymous.get(url).data), 0)
        self.assertEqual(len(self.organizer.get(url).data), 1)


    def test_attendee_cannot_delete_category_or_create_venue(self):
        category = Category.objects.create(name="Tech")
        self.assertEqual(self.attendee.delete("/api/events/categories/%d/" % category.id).status_code, 403)
        venue = {"name": "Hall", "address": "MG Road", "city": "Kochi"}
        self.assertEqual(self.attendee.post("/api/events/venues/", venue, format="json").status_code, 403)

    def test_organizer_can_add_category_and_venue_but_not_delete(self):
        response = self.organizer.post("/api/events/categories/", {"name": "Music"}, format="json")
        self.assertEqual(response.status_code, 201)
        venue = {"name": "Hall", "address": "MG Road", "city": "Kochi"}
        self.assertEqual(self.organizer.post("/api/events/venues/", venue, format="json").status_code, 201)
        self.assertEqual(self.organizer.delete("/api/events/categories/%d/" % response.data["id"]).status_code, 403)
        self.assertEqual(self.admin.delete("/api/events/categories/%d/" % response.data["id"]).status_code, 204)


    def test_review_rules(self):
        event_id = self.make_approved_event()
        url = "/api/events/reviews/"

        not_attended = self.attendee.post(
            url, {"event": event_id, "rating": 5, "comment": "Great"}, format="json"
        )
        self.assertEqual(not_attended.status_code, 403)

        booking_response = self.attendee.post(
            "/api/bookings/bookings/",
            {"event": event_id, "ticket_quantity": 1},
            format="json",
        )
        self.assertEqual(booking_response.status_code, 201)
        booking = booking_response.data
        if booking["status"] == "pending":
            self.attendee.post("/api/bookings/bookings/%d/pay/" % booking["id"])
        marked = self.organizer.post(
            "/api/events/events/%d/attendance/" % event_id,
            {"booking_id": booking["booking_id"], "status": "attended"},
            format="json",
        )
        self.assertEqual(marked.status_code, 200)

        first = self.attendee.post(url, {"event": event_id, "rating": 5, "comment": "Great"}, format="json")
        self.assertEqual(first.status_code, 201)

        again = self.attendee.post(url, {"event": event_id, "rating": 4, "comment": "Again"}, format="json")
        self.assertEqual(again.status_code, 400)
        self.assertIn("already reviewed", again.data["detail"])

        for bad_rating in [0, 6, 99]:
            response = self.other_attendee.post(url, {"event": event_id, "rating": bad_rating, "comment": "x"}, format="json")
            self.assertEqual(response.status_code, 400)

        review_url = "%s%d/" % (url, first.data["id"])
        self.assertEqual(self.other_attendee.patch(review_url, {"comment": "hacked"}, format="json").status_code, 403)
        self.assertEqual(self.other_attendee.delete(review_url).status_code, 403)
        self.assertEqual(self.attendee.patch(review_url, {"comment": "Edited"}, format="json").status_code, 200)
        self.assertEqual(self.attendee.delete(review_url).status_code, 204)
        self.assertEqual(Review.objects.count(), 0)


    def test_person_cannot_change_status_of_own_report(self):
        event_id = self.make_approved_event()
        report = self.attendee.post(
            "/api/events/reports/",
            {"event": event_id, "reason": "spam", "description": "looks fake", "status": "resolved"},
            format="json",
        )
        self.assertEqual(report.status_code, 201)
        self.assertEqual(report.data["status"], "pending")
        url = "/api/events/reports/%d/" % report.data["id"]
        self.assertEqual(self.attendee.patch(url, {"status": "resolved"}, format="json").status_code, 405)


    def test_bad_event_data_is_rejected(self):
        bad_forms = {
            "negative price": event_form(ticket_price="-500"),
            "zero capacity": event_form(capacity=0),
            "end before start": event_form(start_time="12:00", end_time="10:00"),
            "end equals start": event_form(start_time="10:00", end_time="10:00"),
            "date in the past": event_form(date="2001-01-01"),
            "deadline after event": event_form(registration_deadline=str(date.today() + timedelta(days=30))),
        }
        for label, form in bad_forms.items():
            response = self.organizer.post("/api/events/events/", form, format="multipart")
            self.assertEqual(response.status_code, 400, label)

    def test_free_event_and_valid_event_are_accepted(self):
        response = self.organizer.post("/api/events/events/", event_form(ticket_price="0"), format="multipart")
        self.assertEqual(response.status_code, 201)

    def test_editing_only_the_title_of_a_past_event_is_allowed(self):
        event_id = self.make_approved_event()
        Event.objects.filter(pk=event_id).update(date=date(2020, 1, 1))
        response = self.organizer.patch("/api/events/events/%d/" % event_id, {"title": "New title"}, format="multipart")
        self.assertEqual(response.status_code, 200)


    def test_changing_capacity_keeps_available_tickets_correct(self):
        event_id = self.make_approved_event(capacity=5)
        booking = self.attendee.post("/api/bookings/bookings/", {"event": event_id, "ticket_quantity": 3}, format="json")
        self.assertEqual(booking.status_code, 201)
        self.assertEqual(Event.objects.get(pk=event_id).available_tickets, 2)

        url = "/api/events/events/%d/" % event_id
        self.assertEqual(self.organizer.patch(url, {"capacity": 10}, format="multipart").status_code, 200)
        self.assertEqual(Event.objects.get(pk=event_id).available_tickets, 7)

        self.assertEqual(self.organizer.patch(url, {"capacity": 2}, format="multipart").status_code, 400)
        event = Event.objects.get(pk=event_id)
        self.assertEqual((event.capacity, event.available_tickets), (10, 7))

        self.assertEqual(self.organizer.patch(url, {"capacity": 3}, format="multipart").status_code, 200)
        self.assertEqual(Event.objects.get(pk=event_id).available_tickets, 0)


    def test_booking_cannot_be_paid_twice(self):
        event_id = self.make_approved_event()
        booking = self.attendee.post("/api/bookings/bookings/", {"event": event_id, "ticket_quantity": 1}, format="json")
        pay_url = "/api/bookings/bookings/%d/pay/" % booking.data["id"]
        self.assertEqual(self.attendee.post(pay_url).status_code, 200)
        self.assertEqual(self.attendee.post(pay_url).status_code, 400)
        self.assertEqual(self.other_attendee.post(pay_url).status_code, 404)

    def test_bad_ticket_quantities_are_rejected(self):
        event_id = self.make_approved_event(capacity=5)
        for quantity in [0, -1, "abc", 99]:
            response = self.attendee.post("/api/bookings/bookings/", {"event": event_id, "ticket_quantity": quantity}, format="json")
            self.assertEqual(response.status_code, 400, quantity)

    def test_cancellation_of_a_confirmed_booking_requires_organizer_approval(self):
        event_id = self.make_approved_event(capacity=5)
        booking = self.attendee.post("/api/bookings/bookings/", {"event": event_id, "ticket_quantity": 2}, format="json")
        self.assertEqual(Event.objects.get(pk=event_id).available_tickets, 3)
        requested = self.attendee.post("/api/bookings/bookings/%d/request-cancellation/" % booking.data["id"])
        self.assertEqual(requested.status_code, 200)
        self.assertTrue(requested.data["cancellation_requested"])
        self.assertEqual(Event.objects.get(pk=event_id).available_tickets, 3)
        approved = self.organizer.post("/api/bookings/bookings/%d/approve-cancellation/" % booking.data["id"])
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.data["status"], "cancelled")
        self.assertEqual(Event.objects.get(pk=event_id).available_tickets, 5)


    def test_event_list_does_not_ask_the_database_for_every_event(self):
        for number in range(6):
            event_id = self.make_approved_event(title="Event %d" % number)
            self.organizer.post("/api/events/event-images/", {"event": event_id, "image": make_photo()}, format="multipart")
            self.other_attendee.post(
                "/api/events/reviews/", {"event": event_id, "rating": 4, "comment": "ok"}, format="json"
            )
        with self.assertNumQueries(4):
            response = self.anonymous.get("/api/events/events/")
        self.assertEqual(len(response.data), 6)


    def test_unpaid_booking_expires_after_fifteen_minutes(self):
        event_id = self.make_approved_event(capacity=5)
        response = self.attendee.post(
            "/api/bookings/bookings/",
            {"event": event_id, "ticket_quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        booking_id = response.data["id"]
        Booking.objects.filter(pk=booking_id).update(
            booked_at=timezone.now() - timedelta(minutes=16)
        )

        refreshed = self.attendee.get("/api/bookings/bookings/")
        booking = next(item for item in refreshed.data if item["id"] == booking_id)
        self.assertEqual(booking["status"], "cancelled")
        self.assertEqual(booking["payment"]["status"], "failed")
        self.assertIsNone(booking["ticket_token"])
        self.assertEqual(Event.objects.get(pk=event_id).available_tickets, 5)

    def test_ticket_qr_scan_marks_attendee_and_rejects_duplicate(self):
        event_id = self.make_approved_event()
        booking_response = self.attendee.post(
            "/api/bookings/bookings/",
            {"event": event_id, "ticket_quantity": 1},
            format="json",
        )
        self.assertEqual(booking_response.status_code, 201)
        booking = booking_response.data
        if booking["status"] == "pending":
            self.assertIsNone(booking["ticket_token"])
            paid = self.attendee.post("/api/bookings/bookings/%d/pay/" % booking["id"])
            self.assertEqual(paid.status_code, 200)
            booking = self.attendee.get("/api/bookings/bookings/").data
            booking = next(item for item in booking if item["id"] == booking_response.data["id"])
        self.assertEqual(booking["payment"]["status"], "successful")
        self.assertTrue(booking["ticket_token"])

        scan_url = "/api/events/events/%d/scan-ticket/" % event_id
        first_scan = self.organizer.post(scan_url, {"ticket_token": booking["ticket_token"]}, format="json")
        self.assertEqual(first_scan.status_code, 200, first_scan.data)
        self.assertEqual(first_scan.data["status"], "attended")
        refreshed = self.attendee.get("/api/bookings/bookings/")
        used_booking = next(item for item in refreshed.data if item["id"] == booking["id"])
        self.assertIsNone(used_booking["ticket_token"])

        duplicate_scan = self.organizer.post(scan_url, {"ticket_token": booking["ticket_token"]}, format="json")
        self.assertEqual(duplicate_scan.status_code, 400)

    def test_attendee_can_save_and_remove_favorite_event(self):
        event_id = self.make_approved_event()
        favorite_url = "/api/events/events/%d/favorite/" % event_id
        self.assertEqual(self.attendee.post(favorite_url).status_code, 200)
        favorites = self.attendee.get("/api/events/events/favorites/")
        self.assertIn(event_id, favorites.data["event_ids"])
        self.assertEqual(self.attendee.delete(favorite_url).status_code, 200)
        favorites = self.attendee.get("/api/events/events/favorites/")
        self.assertNotIn(event_id, favorites.data["event_ids"])
