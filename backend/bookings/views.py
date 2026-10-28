import uuid
from django.db import transaction, models
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from events.models import Event
from .models import Booking, Payment, Notification, Seat
from .serializers import BookingSerializer, NotificationSerializer

from rest_framework.views import APIView


PAYMENT_HOLD_MINUTES = 15


def expire_unpaid_bookings(event=None):
    cutoff = timezone.now() - timedelta(minutes=PAYMENT_HOLD_MINUTES)
    expired = Booking.objects.select_for_update().filter(
        status="pending",
        booked_at__lte=cutoff,
        payment__status="pending",
    )
    if event is not None:
        expired = expired.filter(event=event)
    expired = list(expired.select_related("event"))
    released_by_event = {}
    for booking in expired:
        booking.status = "cancelled"
        booking.save(update_fields=["status"])
        payment = getattr(booking, "payment", None)
        if payment and payment.status == "pending":
            payment.status = "failed"
            payment.save(update_fields=["status"])
        released_by_event[booking.event_id] = released_by_event.get(booking.event_id, 0) + booking.ticket_quantity
        Notification.objects.get_or_create(
            user=booking.user,
            message=f"Booking {booking.booking_id} was cancelled because payment was not completed within 15 minutes.",
        )
    for event_id, quantity in released_by_event.items():
        Event.objects.filter(pk=event_id).update(
            available_tickets=models.F("available_tickets") + quantity
        )


class SeatMapView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({"detail": "Event not found."}, status=404)

        if event.date < timezone.localdate() or event.status != "approved":
            if not request.user.is_authenticated or (not request.user.is_staff and event.organizer != request.user):
                return Response({"detail": "This event is not available."}, status=404)

        with transaction.atomic():
            expire_unpaid_bookings(event)

        existing_seats = list(Seat.objects.filter(event=event))
        has_bookings = Booking.objects.filter(
            event=event,
            status__in=["pending", "confirmed", "attended"],
            seats__isnull=False,
        ).exists()

        layout = event.seat_layout or []
        if not layout:
            layout = self._make_rectangular_layout(event.seating_rows, event.seats_per_row, event.capacity)

        desired = []
        for row in layout:
            row_name = str(row.get("row", "")).strip().upper()
            for number in row.get("seats", []):
                try:
                    number = int(number)
                except (TypeError, ValueError):
                    continue
                if row_name and number > 0:
                    desired.append((row_name, number))

        desired_labels = {row + str(number) for row, number in desired}
        existing_labels = {seat.label for seat in existing_seats}

        if not existing_seats or (not has_bookings and existing_labels != desired_labels):
            if existing_seats and not has_bookings:
                Seat.objects.filter(event=event).delete()
            batch = []
            for row_name, number in desired:
                half = max(1, len([item for item in desired if item[0] == row_name]) // 2)
                column = number
                section = "Left" if number <= half else "Right"
                batch.append(Seat(
                    event=event,
                    row_label=row_name,
                    seat_number=number,
                    label=f"{row_name}{number}",
                    section=section,
                    column=column,
                ))
            Seat.objects.bulk_create(batch, ignore_conflicts=True)

        seats = Seat.objects.filter(event=event).order_by("row_label", "column")
        occupied_ids = set(Booking.objects.filter(
            event=event, status__in=["pending", "confirmed", "attended"]
        ).values_list("seats__id", flat=True))
        return Response({
            "event_id": event.id,
            "event_title": event.title,
            "capacity": event.capacity,
            "rows": event.seating_rows,
            "seats_per_row": event.seats_per_row,
            "seat_layout": layout,
            "seats": [{
                "id": seat.id, "label": seat.label, "row": seat.row_label,
                "number": seat.seat_number, "column": seat.column,
                "section": seat.section,
                "status": "booked" if seat.id in occupied_ids else "available",
            } for seat in seats],
        })

    @staticmethod
    def _make_rectangular_layout(rows, columns, capacity):
        layout = []
        remaining = int(capacity)
        for row_index in range(max(1, int(rows or 1))):
            row_name = SeatMapView._row_label(row_index + 1)
            count = min(int(columns or 1), max(remaining, 0))
            layout.append({"row": row_name, "seats": list(range(1, count + 1))})
            remaining -= count
        return layout

    @staticmethod
    def _row_label(number):
        label = ""
        while number:
            number, remainder = divmod(number - 1, 26)
            label = chr(65 + remainder) + label
        return label

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Booking.objects.select_related("event","payment","user")
        if self.request.user.is_staff:
            return qs.order_by("-booked_at")
        return qs.filter(user=self.request.user).order_by("-booked_at")

    def list(self, request, *args, **kwargs):
        with transaction.atomic():
            expire_unpaid_bookings()
        return super().list(request, *args, **kwargs)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        expire_unpaid_bookings()
        try:
            event = Event.objects.select_for_update().get(pk=request.data.get("event"))
        except Event.DoesNotExist:
            return Response({"detail": "Event not found."}, status=404)
        try:
            quantity = int(request.data.get("ticket_quantity", 1))
        except (TypeError, ValueError):
            return Response({"detail": "Ticket quantity must be a whole number."}, status=400)
        if quantity < 1:
            return Response({"detail": "Ticket quantity must be at least 1."}, status=400)
        if event.date < timezone.localdate():
            event.status = "inactive"
            event.save(update_fields=["status"])
            return Response({"detail": "This event has expired and is no longer available for booking."}, status=400)

        if event.status != "approved":
            return Response({"detail": "This event is not available for booking."}, status=400)
        if quantity > event.available_tickets:
            return Response({"detail": "Only %d ticket(s) are left for this event." % event.available_tickets}, status=400)
        seat_ids = request.data.get("seat_ids", [])
        if seat_ids is None:
            seat_ids = []
        if not isinstance(seat_ids, list):
            return Response({"detail": "seat_ids must be a list."}, status=400)
        if seat_ids and len(seat_ids) != quantity:
            return Response({"detail": "Select exactly one seat for each ticket."}, status=400)
        selected_seats = []
        if seat_ids:
            if len(set(map(str, seat_ids))) != len(seat_ids):
                return Response({"detail": "A seat cannot be selected more than once."}, status=400)
            selected_seats = list(Seat.objects.select_for_update().filter(event=event, id__in=seat_ids))
            if len(selected_seats) != len(seat_ids):
                return Response({"detail": "One or more selected seats do not belong to this event."}, status=400)
            already_taken = Booking.objects.filter(
                event=event, status__in=["pending", "confirmed", "attended"],
                seats__in=selected_seats,
            ).exists()
            if already_taken:
                return Response({"detail": "One or more selected seats have just been booked. Please choose different seats."}, status=409)

        total = event.ticket_price * quantity
        booking = Booking.objects.create(
            user=request.user,
            event=event,
            ticket_quantity=quantity,
            total_amount=total,
            booking_id="EVT-" + uuid.uuid4().hex[:10].upper(),
            status="pending" if total > 0 else "confirmed",
        )
        if selected_seats:
            booking.seats.set(selected_seats)
        event.available_tickets -= quantity
        event.save(update_fields=["available_tickets"])
        Payment.objects.create(
            booking=booking,
            amount=total,
            transaction_id="TXN-" + uuid.uuid4().hex[:12].upper(),
            status="successful" if total == 0 else "pending",
            paid_at=timezone.now() if total == 0 else None,
        )
        Notification.objects.create(
            user=request.user,
            message=f"Booking {booking.booking_id} created for {event.title}."
        )
        if booking.status == "confirmed":
            Notification.objects.create(
                user=event.organizer,
                message=f"New free-event registration: {request.user.username} registered for {event.title}."
            )
        return Response(self.get_serializer(booking).data, status=201)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def pay(self, request, pk=None):
        booking = self.get_object()
        if booking.status == "pending" and booking.booked_at <= timezone.now() - timedelta(minutes=PAYMENT_HOLD_MINUTES):
            expire_unpaid_bookings(booking.event)
            return Response({"detail": "The 15-minute payment window has expired. The booking was cancelled and the seats are available again."}, status=400)
        if booking.status == "cancelled":
            return Response({"detail": "Cancelled booking cannot be paid."}, status=400)
        if booking.status != "pending":
            return Response({"detail": "This booking is already paid or confirmed."}, status=400)
        payment = booking.payment
        payment.status = "successful"
        payment.paid_at = timezone.now()
        payment.save()
        booking.status = "confirmed"
        booking.save(update_fields=["status"])
        Notification.objects.create(
            user=booking.user,
            message=f"Payment successful. Booking {booking.booking_id} is confirmed."
        )
        Notification.objects.create(
            user=booking.event.organizer,
            message=f"New paid booking for {booking.event.title}."
        )
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["post"], url_path="request-cancellation")
    @transaction.atomic
    def request_cancellation(self, request, pk=None):
        booking = self.get_object()
        if booking.status in ["cancelled", "attended", "absent"]:
            return Response({"detail": "This booking can no longer be cancelled."}, status=400)
        if booking.event.date < timezone.localdate():
            return Response({"detail": "Past event bookings cannot be cancelled."}, status=400)
        if booking.status == "pending":
            booking.status = "cancelled"
            booking.save(update_fields=["status"])
            booking.event.available_tickets += booking.ticket_quantity
            booking.event.save(update_fields=["available_tickets"])
            if booking.payment.status == "pending":
                booking.payment.status = "failed"
                booking.payment.save(update_fields=["status"])
            Notification.objects.create(user=booking.user, message=f"Unpaid booking {booking.booking_id} was cancelled and its seats were released.")
            return Response(self.get_serializer(booking).data)
        if booking.cancellation_requested:
            return Response({"detail": "A cancellation request is already waiting for the organizer."}, status=400)
        booking.cancellation_requested = True
        booking.save(update_fields=["cancellation_requested"])
        Notification.objects.create(user=booking.event.organizer, message=f"Cancellation requested for booking {booking.booking_id} at {booking.event.title}.")
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["post"], url_path="approve-cancellation")
    @transaction.atomic
    def approve_cancellation(self, request, pk=None):
        booking = Booking.objects.select_for_update().select_related("event", "user", "payment").filter(pk=pk).first()
        if booking is None:
            return Response({"detail": "Booking not found."}, status=404)
        if not request.user.is_staff and booking.event.organizer_id != request.user.id:
            return Response({"detail": "You can only approve cancellations for your own events."}, status=403)
        if not booking.cancellation_requested or booking.status != "confirmed":
            return Response({"detail": "This booking has no pending cancellation request."}, status=400)
        booking.status = "cancelled"
        booking.cancellation_requested = False
        booking.save(update_fields=["status", "cancellation_requested"])
        booking.event.available_tickets += booking.ticket_quantity
        booking.event.save(update_fields=["available_tickets"])
        if booking.payment.status == "successful":
            booking.payment.status = "refunded"
            booking.payment.save(update_fields=["status"])
        Notification.objects.create(user=booking.user, message=f"Your cancellation for {booking.event.title} was approved. Any payment refund shown here is simulated in mock-payment mode.")
        from .models import AuditLog
        AuditLog.objects.create(actor=request.user, event=booking.event, action="cancellation_approved", details=booking.booking_id)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def cancel(self, request, pk=None):
        return self.request_cancellation(request, pk)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
