from django.contrib.auth.models import User
from django.db import models
import uuid
from events.models import Event

class Booking(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("attended", "Attended"),
        ("absent", "Absent"),
        ("cancelled", "Cancelled"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings")
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="bookings")
    ticket_quantity = models.PositiveIntegerField(default=1)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    booking_id = models.CharField(max_length=30, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    booked_at = models.DateTimeField(auto_now_add=True)
    ticket_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    cancellation_requested = models.BooleanField(default=False)
    seats = models.ManyToManyField("Seat", blank=True, related_name="bookings")

class Payment(models.Model):
    STATUS_CHOICES = [("pending","Pending"),("successful","Successful"),("failed","Failed"),("refunded","Refunded")]
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="payment")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=60, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    paid_at = models.DateTimeField(null=True, blank=True)

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class Seat(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="seats")
    row_label = models.CharField(max_length=8)
    seat_number = models.PositiveIntegerField()
    label = models.CharField(max_length=20)
    section = models.CharField(max_length=40, default="General")
    column = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["row_label", "column"]
        constraints = [
            models.UniqueConstraint(fields=["event", "label"], name="unique_event_seat_label"),
        ]

    def __str__(self):
        return f"{self.event.title} · {self.label}"


class FavoriteEvent(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorite_events")
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "event"], name="unique_user_favorite_event")]
        ordering = ["-created_at"]


class AuditLog(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="evently_audit_logs")
    event = models.ForeignKey(Event, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    action = models.CharField(max_length=100)
    details = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
