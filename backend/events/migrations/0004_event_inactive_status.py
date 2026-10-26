from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0003_eventimage"),
    ]

    operations = [
        migrations.AlterField(
            model_name="event",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("pending", "Pending Approval"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("ongoing", "Ongoing"),
                    ("completed", "Completed"),
                    ("cancelled", "Cancelled"),
                    ("inactive", "Inactive"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
