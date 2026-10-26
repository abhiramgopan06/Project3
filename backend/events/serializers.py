from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import Category, Venue, Event, EventImage, Review, EventReport

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = "__all__"

class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    class Meta:
        model = Review
        fields = ["id","event","user","user_name","rating","comment","created_at"]
        read_only_fields = ["user"]

class EventImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = EventImage
        fields = ["id", "event", "image", "image_url", "order"]
        read_only_fields = ["order"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return ""

class EventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source="organizer.username", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    venue_name = serializers.CharField(source="venue.name", read_only=True)
    image_url = serializers.SerializerMethodField()
    images = EventImageSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "organizer", "organizer_name", "title", "description", "category", "category_name",
            "venue", "venue_name", "image", "image_url", "images", "date", "start_time", "end_time",
            "location", "address", "ticket_price", "capacity", "seating_rows", "seats_per_row",
            "seat_layout", "available_tickets", "registration_deadline", "status", "created_at",
            "updated_at", "reviews"
        ]
        read_only_fields = ["organizer", "available_tickets", "status"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return ""

    def validate_ticket_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Ticket price cannot be negative.")
        return value

    def validate_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError("Capacity must be at least 1.")
        return value

    def validate_seating_rows(self, value):
        if value < 1:
            raise serializers.ValidationError("Number of rows must be at least 1.")
        return value

    def validate_seats_per_row(self, value):
        if value < 1:
            raise serializers.ValidationError("Number of columns must be at least 1.")
        return value

    def validate_date(self, value):
        is_new_or_changed = self.instance is None or self.instance.date != value
        if is_new_or_changed and value < timezone.localdate():
            raise serializers.ValidationError("The event date cannot be in the past.")
        return value

    def _clean_layout(self, layout, rows, columns):
        if not isinstance(layout, list):
            raise serializers.ValidationError("Seat layout must be a list.")
        cleaned = []
        used = set()
        for row_index, row in enumerate(layout[:rows]):
            if not isinstance(row, dict):
                continue
            row_name = str(row.get("row") or self._row_label(row_index + 1)).strip().upper()
            if not row_name:
                row_name = self._row_label(row_index + 1)
            numbers = []
            for value in row.get("seats", []):
                try:
                    number = int(value)
                except (TypeError, ValueError):
                    continue
                if 1 <= number <= columns and number not in numbers:
                    numbers.append(number)
            numbers.sort()
            for number in numbers:
                key = (row_name, number)
                if key not in used:
                    used.add(key)
            cleaned.append({"row": row_name, "seats": numbers})
        while len(cleaned) < rows:
            cleaned.append({"row": self._row_label(len(cleaned) + 1), "seats": []})
        return cleaned

    @staticmethod
    def _row_label(number):
        label = ""
        while number:
            number, remainder = divmod(number - 1, 26)
            label = chr(65 + remainder) + label
        return label

    def validate(self, data):
        def current(name):
            if name in data:
                return data[name]
            return getattr(self.instance, name, None)

        start_time = current("start_time")
        end_time = current("end_time")
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after the start time."})

        event_date = current("date")
        deadline = current("registration_deadline")
        if deadline and event_date and deadline > event_date:
            raise serializers.ValidationError({"registration_deadline": "The registration deadline cannot be after the event date."})

        default_rows = Event._meta.get_field("seating_rows").get_default()
        default_columns = Event._meta.get_field("seats_per_row").get_default()
        rows = max(1, int(current("seating_rows") or default_rows))
        columns = max(1, int(current("seats_per_row") or default_columns))
        layout_was_provided = "seat_layout" in data
        capacity = int(data.get("capacity", getattr(self.instance, "capacity", Event._meta.get_field("capacity").get_default())))




        rebuild_layout = not layout_was_provided and (
            self.instance is None
            or "capacity" in data
            or "seating_rows" in data
            or "seats_per_row" in data
        )
        if rebuild_layout:
            if capacity > rows * columns:
                raise serializers.ValidationError({
                    "capacity": f"The planned {rows} row(s) with {columns} seat(s) per row can hold at most {rows * columns} seats. Increase the rows or seats per row."
                })
            layout = []
            remaining = max(capacity, 0)
            for row_index in range(rows):
                count = min(columns, remaining)
                layout.append({"row": self._row_label(row_index + 1), "seats": list(range(1, count + 1))})
                remaining -= count
        elif layout_was_provided:
            layout = data.get("seat_layout")
        else:
            layout = getattr(self.instance, "seat_layout", None) if self.instance else None
            if not layout:
                layout = []
                remaining = max(capacity, 0)
                for row_index in range(rows):
                    count = min(columns, remaining)
                    layout.append({"row": self._row_label(row_index + 1), "seats": list(range(1, count + 1))})
                    remaining -= count
        layout = self._clean_layout(layout, rows, columns)
        seat_count = sum(len(row["seats"]) for row in layout)
        if seat_count < 1:
            raise serializers.ValidationError({"seat_layout": "Add at least one seat to the seating plan."})
        data["seat_layout"] = layout
        data["capacity"] = seat_count

        if self.instance is not None:
            from bookings.models import Booking
            has_bookings = Booking.objects.filter(
                event=self.instance,
                status__in=["pending", "confirmed", "attended"],
                seats__isnull=False,
            ).exists()
            old_layout = self.instance.seat_layout or []
            arrangement_changed = rows != self.instance.seating_rows or columns != self.instance.seats_per_row or layout != old_layout
            if has_bookings and arrangement_changed:
                raise serializers.ValidationError({
                    "seat_layout": "The seating arrangement cannot be changed after seats have been booked."
                })

        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        latest = Event.objects.select_for_update().get(pk=instance.pk)
        tickets_sold = latest.capacity - latest.available_tickets
        new_capacity = validated_data.get("capacity", latest.capacity)
        if new_capacity < tickets_sold:
            raise serializers.ValidationError({
                "capacity": "%d tickets are already sold, so the capacity cannot be lower than that." % tickets_sold
            })
        event = super().update(instance, validated_data)
        event.available_tickets = new_capacity - tickets_sold
        event.save(update_fields=["available_tickets"])
        return event

class EventReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventReport
        fields = "__all__"
        read_only_fields = ["user", "status"]
