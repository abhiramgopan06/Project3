from datetime import datetime
from django.utils import timezone
from rest_framework import serializers
from .models import Booking, Payment, Notification

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["amount","transaction_id","status","paid_at"]

class BookingSerializer(serializers.ModelSerializer):
    seat_labels = serializers.SerializerMethodField()
    ticket_token = serializers.SerializerMethodField()

    def get_seat_labels(self, obj):
        return list(obj.seats.order_by("row_label", "column").values_list("label", flat=True))

    def get_ticket_token(self, obj):
        payment = getattr(obj, "payment", None)
        if obj.status != "confirmed" or payment is None or payment.status != "successful":
            return None
        event_end = timezone.make_aware(datetime.combine(obj.event.date, obj.event.end_time))
        if timezone.now() >= event_end:
            return None
        return str(obj.ticket_token)

    event_title = serializers.CharField(source="event.title", read_only=True)
    event_date = serializers.DateField(source="event.date", read_only=True)
    event_location = serializers.CharField(source="event.location", read_only=True)
    payment = PaymentSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id","user","event","event_title","event_date","event_location",
            "ticket_quantity","total_amount","booking_id","status","booked_at","payment","seat_labels","ticket_token","checked_in_at","cancellation_requested"
        ]
        read_only_fields = ["user","total_amount","booking_id","status","ticket_token","checked_in_at","cancellation_requested"]

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["user"]
