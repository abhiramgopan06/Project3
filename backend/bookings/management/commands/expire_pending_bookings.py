from django.core.management.base import BaseCommand
from django.db import transaction
from bookings.views import expire_unpaid_bookings


class Command(BaseCommand):
    help = "Cancel unpaid reservations whose 15-minute payment window has expired."

    def handle(self, *args, **options):
        with transaction.atomic():
            expire_unpaid_bookings()
        self.stdout.write(self.style.SUCCESS("Expired unpaid reservations have been processed."))
