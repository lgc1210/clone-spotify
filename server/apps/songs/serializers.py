from rest_framework import serializers
from .models import Song
from apps.users.models import User
from apps.listenedAt.models import ListenedAt
from apps.genre.serializers import GenreSerializer
from apps.users.serializers import UserDetailSerializer
from bson import ObjectId
from mongoengine.errors import DoesNotExist
from datetime import datetime
from apps.playlists.serializers import PlaylistSerializer


class SongSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField()
    genre = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    duration = serializers.IntegerField()
    released_at = serializers.DateTimeField()
    deleted_at = serializers.DateTimeField(
        read_only=True, required=False, allow_null=True
    )

    def get_genre(self, obj):
        if not obj.genre:
            return []
        return GenreSerializer(obj.genre, many=True).data

    def get_user(self, obj):
        try:
            if not obj.user:
                return None
            return UserDetailSerializer(obj.user).data
        except DoesNotExist:
            return None  # Return None if user reference is invalid


class EnhancedSongSerializer(SongSerializer):
    audio_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()
    listened_at_count = serializers.SerializerMethodField()

    def get_audio_url(self, obj):
        request = self.context.get("request")
        if request and obj.audio and hasattr(obj.audio, "grid_id"):
            base_url = request.build_absolute_uri("/").rstrip("/")
            return f"{base_url}/api/songs/{obj.id}/audio"   
        return None

    def get_video_url(self, obj):
        request = self.context.get("request")
        if request and obj.video and hasattr(obj.video, "grid_id"):
            base_url = request.build_absolute_uri("/").rstrip("/")
            return f"{base_url}/api/songs/{obj.id}/video"
        return None

    def get_cover_url(self, obj):
        request = self.context.get("request")
        if request and obj.cover and hasattr(obj.cover, "grid_id"):
            base_url = request.build_absolute_uri("/").rstrip("/")
            return f"{base_url}/api/songs/{obj.id}/cover"
        return None

    def get_listened_at_count(self, obj):
        return ListenedAt.objects.filter(song=obj).count()


class SongCreateSerializer(serializers.Serializer):
    """Serializer for creating songs with file uploads"""

    title = serializers.CharField()
    genre_ids = serializers.ListField(child=serializers.CharField(), required=False)
    audio = serializers.FileField()
    video = serializers.FileField()  # Added video field as required
    cover = serializers.FileField(required=False)
    duration = serializers.IntegerField()
    released_at = serializers.DateTimeField(required=False)
    deleted_at = serializers.DateTimeField(
        required=False, allow_null=True, default=None
    )

    def create(self, validated_data):
        from apps.genre.models import Genre

        # Extract genre_ids and remove from validated_data
        genre_ids = validated_data.pop("genre_ids", [])

        # If genre_ids is a single string, split it
        if genre_ids and isinstance(genre_ids, str):
            genre_ids = genre_ids.split(",")
        elif (
            genre_ids
            and isinstance(genre_ids, list)
            and len(genre_ids) == 1
            and "," in genre_ids[0]
        ):
            genre_ids = genre_ids[0].split(",")

        # Get genres from ids
        genres = []
        for genre_id in genre_ids:
            try:
                ObjectId(genre_id)  # Raises InvalidId if invalid
                genre = Genre.objects.get(id=genre_id)
                genres.append(genre)
            except (DoesNotExist, ValueError):
                continue  # Skip invalid or non-existent genres

        # Add genres to data
        validated_data["genre"] = genres

        # Add released_at
        validated_data["released_at"] = validated_data.get(
            "released_at", datetime.now()
        )

        # Add deleted_at null
        validated_data["deleted_at"] = validated_data.get("deleted_at", None)

        # Get user from request context
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["user"] = request.user
        else:
            # Instead of hardcoding a user ID, set to None for anonymous uploads
            validated_data["user"] = None

        # Create the song
        return Song.create(validated_data)


class SearchSerializer(serializers.Serializer):
    songs = EnhancedSongSerializer(required=False, many=True)
    users = UserDetailSerializer(required=False, many=True)
    playlists = PlaylistSerializer(required=False, many=True)
    most_listened_songs = EnhancedSongSerializer(required=False, many=True)
