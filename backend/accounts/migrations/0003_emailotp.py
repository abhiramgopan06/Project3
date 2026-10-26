"""Legacy duplicate OTP migration kept for compatibility with existing databases.

The active EmailOTP model is created by
0003_profile_email_verified_emailotp.py. Creating it again here would cause
a duplicate-table error on a fresh database. This migration intentionally
performs no database operations; the merge migration joins the two branches.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_profile_status"),
    ]

    operations = []
