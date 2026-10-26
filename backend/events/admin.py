from django.contrib import admin
from .models import Category, Venue, Event, EventImage, Review, EventReport

class EventImageInline(admin.TabularInline):
    model = EventImage
    extra = 1

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title","organizer","date","ticket_price","available_tickets","status")
    list_filter = ("status","category","date")
    search_fields = ("title","location","organizer__username")
    list_editable = ("status",)
    inlines = [EventImageInline]

admin.site.register(Category)
admin.site.register(Venue)
admin.site.register(Review)
admin.site.register(EventReport)
