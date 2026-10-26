from django.contrib.auth.models import User
from django.db import models

class Profile(models.Model):
    ROLE_CHOICES = [
        ("attendee", "Attendee"),
        ("organizer", "Organizer"),
    ]
    STATUS_CHOICES = [
        ("approved", "Approved"),
        ("pending", "Pending Approval"),
        ("rejected", "Rejected"),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="attendee")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="approved")
    phone = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)


    email_verified = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username} - {self.role} ({self.status})"



class EmailOTP(models.Model):
    """One-time password sent to a user's email address during registration.

    Only a hash of the code is stored, never the code itself.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="email_otp")
    code_hash = models.CharField(max_length=128)
    sent_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"OTP for {self.user.username}"
