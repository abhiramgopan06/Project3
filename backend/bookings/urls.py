from rest_framework.routers import DefaultRouter
from .views import BookingViewSet, NotificationViewSet, SeatMapView
from django.urls import path

router = DefaultRouter()
router.register("bookings", BookingViewSet, basename="booking")
router.register("notifications", NotificationViewSet, basename="notification")
urlpatterns = [path("seat-map/<int:event_id>/", SeatMapView.as_view(), name="seat-map")] + router.urls
