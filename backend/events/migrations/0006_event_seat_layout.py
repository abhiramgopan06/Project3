from django.db import migrations, models


def build_layout(apps, schema_editor):
    Event = apps.get_model("events", "Event")
    for event in Event.objects.all():
        rows = max(1, event.seating_rows or 1)
        columns = max(1, event.seats_per_row or 1)
        remaining = event.capacity
        layout = []
        for row_index in range(rows):
            row_label = ""
            number = row_index + 1
            while number:
                number, remainder = divmod(number - 1, 26)
                row_label = chr(65 + remainder) + row_label
            count = min(columns, max(remaining, 0))
            layout.append({"row": row_label, "seats": list(range(1, count + 1))})
            remaining -= count
        event.seat_layout = layout
        event.save(update_fields=["seat_layout"])


class Migration(migrations.Migration):
    dependencies = [("events", "0005_event_seating_arrangement")]

    operations = [
        migrations.AddField(
            model_name="event",
            name="seat_layout",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(build_layout, migrations.RunPython.noop),
    ]
