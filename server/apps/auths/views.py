from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    CustomTokenObtainPairSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
)
from apps.users.models import User
from rest_framework_simplejwt.views import TokenObtainPairView
import bcrypt
from rest_framework.permissions import AllowAny
from apps.auths.utils import (
    generate_google_auth_url,
    get_google_tokens,
    get_google_user_info,
    get_or_create_user,
    create_tokens,
)
from apps.playlists.models import Playlist
import datetime


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GoogleAuthURLView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        auth_url = generate_google_auth_url()
        return Response({"auth_url": auth_url})


class GoogleCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get("code")
        error = request.GET.get("error")

        print(f"Vào được callback r")

        if error or not code:
            return Response(
                {"error": "Lỗi xác thực Google"}, status=status.HTTP_400_BAD_REQUEST
            )

        token_data = get_google_tokens(code)
        if not token_data:
            return Response(
                {"error": "Lỗi xác thực Google"}, status=status.HTTP_400_BAD_REQUEST
            )

        user_info = get_google_user_info(token_data["access_token"])

        if not user_info:
            return Response(
                {"error": "Lỗi xác thực Google"}, status=status.HTTP_400_BAD_REQUEST
            )

        user = get_or_create_user(user_info)
        tokens = create_tokens(user)

        playlist_data = {
            "user": user,
            "name": "Favorite",
                    "desc": "Your favorite songs",
                    "is_favorite": True,
                    "created_at": datetime.datetime.now(),
                    "updated_at": datetime.datetime.now(),
        }
        Playlist.create(playlist_data)

        print("Trả về token và user")
        print(f"User: {user.name}")

        return Response(
            {
                "success": True,
                "message": "Đăng nhập Google thành công",
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": tokens["user"],
            },
            status=status.HTTP_200_OK,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Tạo token
            token_serializer = CustomTokenObtainPairSerializer()
            tokens = token_serializer.validate(
                {"email": user.email, "password": request.data["password"]}
            )

            return Response(tokens, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Với JWT, logout chỉ đơn giản là client xóa token
        # Server không cần làm gì đặc biệt
        return Response({"message": "Đăng xuất thành công"})


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Đảm bảo request.user là đối tượng User từ MongoDB
        user = request.user

        # Nếu không có user, trả về lỗi
        if not user:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        print(f"User: {user.name}")
        # Serialize user data
        user_data = {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "bio": user.bio,
            "image": user.image,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }

        return Response(user_data)

    def put(self, request):
        user = request.user

        # Update user fields
        if "name" in request.data:
            user.name = request.data["name"]
        if "bio" in request.data:
            user.bio = request.data["bio"]
        if "image" in request.data:
            user.image = request.data["image"]

        # Save the updated user
        user.save()

        user_data = {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "bio": user.bio,
            "image": user.image,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }

        return Response(user_data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            # Kiểm tra mật khẩu cũ
            old_password = serializer.validated_data["old_password"].encode(
                "utf-8")
            stored_password = request.user.password.encode("utf-8")

            if not bcrypt.checkpw(old_password, stored_password):
                return Response(
                    {"old_password": ["Mật khẩu cũ không chính xác."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Mã hóa và lưu mật khẩu mới
            new_password = serializer.validated_data["new_password"].encode(
                "utf-8")
            hashed_password = bcrypt.hashpw(new_password, bcrypt.gensalt()).decode(
                "utf-8"
            )

            user = request.user
            user.password = hashed_password
            user.save()

            return Response({"message": "Đổi mật khẩu thành công"})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
