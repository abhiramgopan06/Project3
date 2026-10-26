from django.contrib.auth.models import User
from django.db import models
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
