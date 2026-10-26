from rest_framework.routers import DefaultRouter
from .views import EventViewSet, CategoryViewSet, VenueViewSet, EventImageViewSet, ReviewViewSet, ReportViewSet

router = DefaultRouter()
router.register("events", EventViewSet, basename="event")
router.register("categories", CategoryViewSet)
router.register("venues", VenueViewSet)
router.register("event-images", EventImageViewSet, basename="eventimage")
router.register("reviews", ReviewViewSet)
router.register("reports", ReportViewSet)

urlpatterns = router.urls
