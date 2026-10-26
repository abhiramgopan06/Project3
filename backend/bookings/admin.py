from django.contrib import admin
from .models import Booking, Payment, Notification, Seat
admin.site.register(Booking)
admin.site.register(Payment)
admin.site.register(Notification)
admin.site.register(Seat)
