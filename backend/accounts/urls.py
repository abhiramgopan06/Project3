from django.urls import path
from .views import (
    RegisterView,
    VerifyOtpView,
    ResendOtpView,
    LoginView,
    GoogleLoginView,
    MeView,
    PendingOrganizersView,
    ApproveOrganizerView,
    RejectOrganizerView,
)

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("verify-otp/", VerifyOtpView.as_view()),
    path("resend-otp/", ResendOtpView.as_view()),
    path("login/", LoginView.as_view()),
    path("google/", GoogleLoginView.as_view()),
    path("me/", MeView.as_view()),
    path("organizers/pending/", PendingOrganizersView.as_view()),
    path("organizers/<int:user_id>/approve/", ApproveOrganizerView.as_view()),
    path("organizers/<int:user_id>/reject/", RejectOrganizerView.as_view()),
]
