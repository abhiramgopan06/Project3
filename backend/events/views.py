from django.db.models import Q, Avg
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from .models import Category, Venue, Event, EventImage, Review, EventReport
from .serializers import CategorySerializer, VenueSerializer, EventSerializer, EventImageSerializer, ReviewSerializer, EventReportSerializer
from .permissions import IsOrganizer

def organizer_or_admin_rules(action):

    if action == "create":
        return [permissions.IsAuthenticated(), IsOrganizer()]
    if action in ["update", "partial_update", "destroy"]:
        return [permissions.IsAdminUser()]
    return [permissions.AllowAny()]

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer

    def get_permissions(self):
        return organizer_or_admin_rules(self.action)

class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all().order_by("city","name")
    serializer_class = VenueSerializer

    def get_permissions(self):
        return organizer_or_admin_rules(self.action)

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    queryset = Event.objects.select_related("organizer","category","venue").prefetch_related("reviews__user","images").all().order_by("date","start_time")

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsOrganizer()]
        if self.action in ["approve", "reject"]:
            return [permissions.IsAdminUser()]
        if self.action in ["update", "partial_update", "destroy", "mine", "attendees", "attendance"]:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        Event.objects.filter(
            date__lt=timezone.localdate()
        ).exclude(
            status__in=["inactive", "cancelled", "rejected"]
        ).update(status="inactive")

        qs = super().get_queryset()
        params = self.request.query_params
        user = self.request.user
        if self.action == "retrieve":


            if not (user.is_authenticated and user.is_staff):
                qs = qs.filter(Q(status="approved") | Q(organizer=user))
        elif user.is_authenticated and user.is_staff:
            pass
        elif user.is_authenticated:
            if hasattr(user, "profile") and getattr(user.profile, "role", "") == "organizer":
                qs = qs.filter(Q(status="approved", date__gte=timezone.localdate()) | Q(organizer=user))
            else:
                qs = qs.filter(status="approved", date__gte=timezone.localdate())
        else:
            qs = qs.filter(status="approved", date__gte=timezone.localdate())
        q = params.get("search")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(location__icontains=q))
        if params.get("category"):
            qs = qs.filter(category_id=params["category"])
        if params.get("location"):
            qs = qs.filter(location__icontains=params["location"])
        if params.get("min_price"):
            qs = qs.filter(ticket_price__gte=params["min_price"])
        if params.get("max_price"):
            qs = qs.filter(ticket_price__lte=params["max_price"])
        if params.get("date"):
            qs = qs.filter(date=params["date"])
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        return qs.distinct()

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user, status="pending")

    def perform_update(self, serializer):
        instance = self.get_object()
        if not self.request.user.is_staff and instance.organizer != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only edit your own events.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.is_staff and instance.organizer != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own events.")
        instance.delete()

    @action(detail=False, methods=["get"], url_path=r"organizer/(?P<organizer_id>[^/.]+)", permission_classes=[permissions.AllowAny])
    def organizer_events(self, request, organizer_id=None):
        """Return an organizer's approved events, including past events for their public profile."""
        qs = self.queryset.filter(organizer_id=organizer_id, status="approved").order_by("-date", "-start_time")
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        Event.objects.filter(
            organizer=request.user,
            date__lt=timezone.localdate()
        ).exclude(status__in=["inactive", "cancelled", "rejected"]).update(status="inactive")
        qs = self.queryset.filter(organizer=request.user).order_by("date", "start_time")
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsOrganizer])
    def history(self, request):
        Event.objects.filter(
            organizer=request.user,
            date__lt=timezone.localdate()
        ).exclude(status__in=["inactive", "cancelled", "rejected"]).update(status="inactive")
        qs = self.queryset.filter(organizer=request.user).filter(
            Q(date__lt=timezone.localdate()) | Q(status__in=["inactive", "completed", "cancelled", "rejected"])
        ).order_by("-date", "-start_time")
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def attendees(self, request, pk=None):
        event = self.get_object()
        if not request.user.is_staff and event.organizer != request.user:
            raise PermissionDenied("You can only view attendees for your own events.")

        from bookings.models import Booking
        confirmed_bookings = (
            Booking.objects.filter(event=event, status__in=["confirmed", "attended", "absent"])
            .select_related("user")
            .order_by("-booked_at")
        )
        occupied_seats = event.capacity - event.available_tickets

        attendee_list = []
        for booking in confirmed_bookings:
            attendee_list.append({
                "booking_id": booking.booking_id,
                "name": booking.user.get_full_name() or booking.user.username,
                "email": booking.user.email,
                "ticket_quantity": booking.ticket_quantity,
                "status": booking.status,
                "booked_at": booking.booked_at,
            })

        return Response({
            "event_id": event.id,
            "event_title": event.title,
            "total_seats": event.capacity,
            "occupied_seats": occupied_seats,
            "vacant_seats": event.available_tickets,
            "attendees": attendee_list,
        })

    @action(detail=True, methods=["post"], url_path="attendance")
    def attendance(self, request, pk=None):
        event = self.get_object()
        if not request.user.is_staff and event.organizer != request.user:
            raise PermissionDenied("You can only update attendance for your own events.")

        booking_id = request.data.get("booking_id")
        attendance_status = request.data.get("status")
        if attendance_status not in ["attended", "absent"]:
            raise ValidationError({"status": "Choose attended or absent."})

        from bookings.models import Booking
        try:
            booking = Booking.objects.get(
                event=event,
                booking_id=booking_id,
                status__in=["confirmed", "attended", "absent"],
            )
        except Booking.DoesNotExist:
            raise ValidationError({"booking_id": "Confirmed booking was not found for this event."})

        booking.status = attendance_status
        booking.save(update_fields=["status"])
        return Response({"booking_id": booking.booking_id, "status": booking.status})

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        event = self.get_object()
        event.status = "approved"
        event.save()
        return Response(self.get_serializer(event).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        event = self.get_object()
        event.status = "rejected"
        event.save()
        return Response(self.get_serializer(event).data)


class EventImageViewSet(viewsets.ModelViewSet):

    serializer_class = EventImageSerializer
    queryset = EventImage.objects.select_related("event").all()

    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()

        user = self.request.user
        if not (user.is_authenticated and user.is_staff):
            if user.is_authenticated:
                qs = qs.filter(Q(event__status="approved") | Q(event__organizer=user))
            else:
                qs = qs.filter(event__status="approved")
        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    def _check_owns_event(self, event):
        user = self.request.user
        if not user.is_staff and event.organizer != user:
            raise PermissionDenied("You can only manage photos for your own events.")

    def perform_create(self, serializer):
        event = serializer.validated_data.get("event")
        self._check_owns_event(event)

        next_order = EventImage.objects.filter(event=event).count()
        serializer.save(order=next_order)

    def perform_destroy(self, instance):
        self._check_owns_event(instance.event)
        instance.delete()


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    queryset = Review.objects.select_related("user","event").all().order_by("-created_at")
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):

        event = serializer.validated_data.get("event")
        if Review.objects.filter(event=event, user=self.request.user).exists():
            raise ValidationError({"detail": "You have already reviewed this event."})
        from bookings.models import Booking
        attended = Booking.objects.filter(
            event=event, user=self.request.user, status="attended"
        ).exists()
        if not attended:
            raise PermissionDenied("You can write a review only after the organizer marks you as attended.")
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):

        if not self.request.user.is_staff and serializer.instance.user != self.request.user:
            raise PermissionDenied("You can only edit your own reviews.")
        serializer.save()

    def perform_destroy(self, instance):

        if not self.request.user.is_staff and instance.user != self.request.user:
            raise PermissionDenied("You can only delete your own reviews.")
        instance.delete()

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = EventReportSerializer
    queryset = EventReport.objects.all().order_by("-created_at")
    permission_classes = [permissions.IsAuthenticated]

    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
