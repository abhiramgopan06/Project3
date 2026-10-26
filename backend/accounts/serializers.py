from django.contrib.auth.models import User
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.db.models import Q
from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import Profile

class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role", read_only=True)
    status = serializers.CharField(source="profile.status", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "role", "status", "is_staff"]
        read_only_fields = ["is_staff"]

class RegisterSerializer(serializers.ModelSerializer):


    username = serializers.CharField(max_length=150, validators=[UnicodeUsernameValidator()])
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=["attendee", "organizer"], default="attendee")

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name", "role"]

    def validate_username(self, value):
        value = value.strip()
        taken = User.objects.filter(username=value).exclude(profile__email_verified=False)
        if taken.exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        taken = User.objects.filter(email__iexact=value).exclude(profile__email_verified=False)
        if taken.exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        role = validated_data.pop("role", "attendee")


        User.objects.filter(profile__email_verified=False).filter(
            Q(username=validated_data["username"]) | Q(email__iexact=validated_data["email"])
        ).delete()

        user = User.objects.create_user(**validated_data)
        user.is_active = False
        user.save(update_fields=["is_active"])
        status = "pending" if role == "organizer" else "approved"
        Profile.objects.create(user=user, role=role, status=status, email_verified=False)
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs["username"].strip()
        user = authenticate(username=username, password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Invalid username or password.")
        if not hasattr(user, "profile"):
            Profile.objects.create(user=user)

        profile = user.profile
        if profile.role == "organizer" and profile.status == "pending":
            raise serializers.ValidationError(
                "Your organizer registration is still waiting for admin approval. "
                "Please check back later."
            )
        if profile.role == "organizer" and profile.status == "rejected":
            raise serializers.ValidationError(
                "The admin has rejected your organizer registration request."
            )

        attrs["user"] = user
        return attrs

class OrganizerRequestSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source="profile.status")

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "status", "date_joined"]
