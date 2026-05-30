from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    name     = serializers.CharField(max_length=120, trim_whitespace=True)
    email    = serializers.EmailField()
    password = serializers.CharField(min_length=8, max_length=128, write_only=True)
    # SECURITY: registration may only create customers or vendors. "admin" is
    # intentionally excluded so accounts can't self-escalate to admin.
    role     = serializers.ChoiceField(choices=["customer", "vendor"], default="customer")

    # Optional vendor fields (only used when role == "vendor")
    store_name        = serializers.CharField(max_length=120, required=False, allow_blank=True)
    store_description = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("name is required")
        return value

    def validate_email(self, value):
        return value.strip().lower()


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        return value.strip().lower()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, max_length=128, write_only=True)


class ProfileUpdateSerializer(serializers.Serializer):
    name    = serializers.CharField(max_length=120, required=False, allow_blank=True)
    email   = serializers.EmailField(required=False)
    phone   = serializers.CharField(max_length=20,  required=False, allow_blank=True)
    address = serializers.CharField(max_length=300, required=False, allow_blank=True)
    city    = serializers.CharField(max_length=80,  required=False, allow_blank=True)
    pincode = serializers.CharField(max_length=12,  required=False, allow_blank=True)
    state   = serializers.CharField(max_length=80,  required=False, allow_blank=True)

    def validate_email(self, value):
        return value.strip().lower()
