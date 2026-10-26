from django.urls import path
from django.db.models import Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Booking
from events.models import Event

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        if request.user.is_staff:
            events = Event.objects.all()
            bookings = Booking.objects.all()
        elif hasattr(request.user, "profile") and request.user.profile.role == "organizer":
            events = Event.objects.filter(organizer=request.user)
            bookings = Booking.objects.filter(event__organizer=request.user)
        else:
            attendee_bookings = Booking.objects.filter(user=request.user)
            attended_bookings = attendee_bookings.filter(status="attended")
            upcoming_bookings = attendee_bookings.filter(
                status="confirmed", event__date__gte=timezone.localdate()
            )
            reviewed_event_ids = request.user.event_reviews.values_list("event_id", flat=True)
            return Response({
                "upcoming_events": upcoming_bookings.values("event_id").distinct().count(),
                "attended_events": attended_bookings.values("event_id").distinct().count(),
                "reviews_to_write": attended_bookings.exclude(
                    event_id__in=reviewed_event_ids
                ).values("event_id").distinct().count(),
                "money_spent": float(
                    attendee_bookings.filter(status__in=["confirmed", "attended"])
                    .aggregate(total=Sum("total_amount"))["total"] or 0
                ),
            })
        return Response({
            "events": events.count(),
            "upcoming_events": events.filter(status="approved").count(),
            "bookings": bookings.count(),
            "revenue": float(bookings.filter(status__in=["confirmed","attended"]).aggregate(total=Sum("total_amount"))["total"] or 0),
            "attendees": bookings.filter(status__in=["confirmed","attended"]).aggregate(total=Sum("ticket_quantity"))["total"] or 0,
        })

urlpatterns = [path("dashboard/", DashboardView.as_view())]
