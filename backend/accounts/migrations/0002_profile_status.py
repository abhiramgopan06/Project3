from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='status',
            field=models.CharField(
                choices=[('approved', 'Approved'), ('pending', 'Pending Approval'), ('rejected', 'Rejected')],
                default='approved',
                max_length=20,
            ),
        ),
    ]
