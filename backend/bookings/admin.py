from django.contrib import admin
from .models import AuditLog, Booking, FavoriteEvent, Notification, Payment, Seat


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("booking_id", "user", "event", "status", "total_amount", "booked_at", "checked_in_at")
    list_filter = ("status", "event")
    search_fields = ("booking_id", "user__username", "user__email", "event__title")
    readonly_fields = ("ticket_token", "booked_at", "checked_in_at")


admin.site.register(Payment)
admin.site.register(Notification)
admin.site.register(Seat)
admin.site.register(FavoriteEvent)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "event", "action", "details")
    list_filter = ("action", "created_at")
    search_fields = ("actor__username", "event__title", "details")
    readonly_fields = ("actor", "event", "action", "details", "created_at")
