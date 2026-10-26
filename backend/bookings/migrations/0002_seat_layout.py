from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Seat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("row_label", models.CharField(max_length=8)),
                ("seat_number", models.PositiveIntegerField()),
                ("label", models.CharField(max_length=20)),
                ("section", models.CharField(default="General", max_length=40)),
                ("column", models.PositiveIntegerField(default=1)),
                ("event", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="seats", to="events.event")),
            ],
            options={"ordering": ["row_label", "column"]},
        ),
        migrations.AddConstraint(
            model_name="seat",
            constraint=models.UniqueConstraint(fields=("event", "label"), name="unique_event_seat_label"),
        ),
        migrations.AddField(
            model_name="booking",
            name="seats",
            field=models.ManyToManyField(blank=True, related_name="bookings", to="bookings.seat"),
        ),
    ]
