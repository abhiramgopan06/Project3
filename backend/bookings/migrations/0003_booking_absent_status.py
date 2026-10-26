from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("bookings", "0002_seat_layout")]

    operations = [
        migrations.AlterField(
            model_name="booking",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("confirmed", "Confirmed"),
                    ("attended", "Attended"),
                    ("absent", "Absent"),
                    ("cancelled", "Cancelled"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
