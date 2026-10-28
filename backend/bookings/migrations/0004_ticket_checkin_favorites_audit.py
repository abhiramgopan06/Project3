import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def populate_ticket_tokens(apps, schema_editor):
    Booking = apps.get_model("bookings", "Booking")
    for booking in Booking.objects.filter(ticket_token__isnull=True).iterator():
        booking.ticket_token = uuid.uuid4()
        booking.save(update_fields=["ticket_token"])


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0003_booking_absent_status"),
        ("events", "0006_event_seat_layout"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="ticket_token",
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.RunPython(populate_ticket_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="booking",
            name="ticket_token",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="checked_in_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="cancellation_requested",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="FavoriteEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("event", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="favorited_by", to="events.event")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="favorite_events", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="favoriteevent",
            constraint=models.UniqueConstraint(fields=("user", "event"), name="unique_user_favorite_event"),
        ),
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(max_length=100)),
                ("details", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("event", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to="events.event")),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="evently_audit_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
