from django.db import migrations, models


def set_old_event_seating(apps, schema_editor):
    Event = apps.get_model("events", "Event")
    for event in Event.objects.all():
        seats_per_row = 20
        rows = max(1, (event.capacity + seats_per_row - 1) // seats_per_row)
        event.seating_rows = rows
        event.seats_per_row = seats_per_row
        event.save(update_fields=["seating_rows", "seats_per_row"])


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0004_event_inactive_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="seating_rows",
            field=models.PositiveIntegerField(default=3),
        ),
        migrations.AddField(
            model_name="event",
            name="seats_per_row",
            field=models.PositiveIntegerField(default=20),
        ),
        migrations.RunPython(set_old_event_seating, migrations.RunPython.noop),
    ]
