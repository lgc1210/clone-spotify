from .serializers import (
    UserDetailSerializer,
    EnhancedSongSerializer,
    PlaylistSerializer,
    SongCreateSerializer
)
from apps.songs.models import Song
from django.http import HttpResponse, StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from gridfs import GridFS
from mongoengine.connection import get_db
from .models import Song
from apps.users.models import User
from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework import status
from bson import ObjectId
from gridfs.errors import NoFile
from apps.playlists.models import Playlist

# Use the existing MongoDB connection from MongoEngine
db = get_db()
fs = GridFS(db)


class SongListView(ListCreateAPIView):
    serializer_class = EnhancedSongSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Song.findAll()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        return context


class SongDetailView(RetrieveAPIView):
    serializer_class = EnhancedSongSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        song_id = self.kwargs.get("song_id")
        return Song.findById(song_id)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        return context


class SongFileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, song_id):
        try:
            song = Song.findById(song_id)
            if not song:
                return Response(
                    {"error": "Song not found"}, status=status.HTTP_404_NOT_FOUND
                )

            file_id = song.audio.grid_id
            if not fs.exists({"_id": ObjectId(file_id)}):
                return Response(
                    {"error": "Audio file not found"}, status=status.HTTP_404_NOT_FOUND
                )

            grid_file = fs.get(ObjectId(file_id))
            file_size = grid_file.length

            range_header = request.headers.get("Range", "").strip()
            start, end = 0, file_size - 1

            if range_header.startswith("bytes="):
                byte_range = range_header.replace("bytes=", "")
                if "-" in byte_range:
                    start_str, end_str = byte_range.split("-")
                    start = int(start_str) if start_str else 0
                    end = int(end_str) if end_str else file_size - 1

            chunk_size = end - start + 1
            grid_file.seek(start)

            def stream_generator():
                remaining = chunk_size
                while remaining > 0:
                    chunk = grid_file.read(min(8192, remaining))
                    if not chunk:
                        break
                    yield chunk
                    remaining -= len(chunk)

            response = StreamingHttpResponse(
                stream_generator(),
                status=206,
                content_type=grid_file.content_type or "audio/mpeg",
            )
            response["Content-Disposition"] = f'inline; filename="{song.title}.mp3"'
            response["Content-Length"] = str(chunk_size)
            response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
            response["Accept-Ranges"] = "bytes"

            return response

        except NoFile:
            return Response(
                {"error": "File not found in GridFS"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SongVideoView(APIView):
    """View for streaming video files"""

    permission_classes = [AllowAny]

    def get(self, request, song_id):
        try:
            # Get the song document
            song = Song.findById(song_id)
            if not song:
                return Response(
                    {"error": "Song not found"}, status=status.HTTP_404_NOT_FOUND
                )

            # Get the file_id from the song's video field
            file_id = song.video.grid_id

            # Retrieve the file from GridFS
            if not fs.exists(file_id):
                return Response(
                    {"error": "Video file not found"}, status=status.HTTP_404_NOT_FOUND
                )

            grid_file = fs.get(file_id)

            # Create a streaming response
            response = StreamingHttpResponse(
                grid_file, content_type=grid_file.content_type or "video/mp4"
            )

            # Set content disposition and length headers
            response["Content-Disposition"] = f'inline; filename="{song.title}.mp4"'
            response["Content-Length"] = grid_file.length

            return response

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SongCoverView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, song_id):
        try:
            # Get the song document
            song = Song.findById(song_id)
            if not song:
                return Response(
                    {"error": "Song not found"}, status=status.HTTP_404_NOT_FOUND
                )

            # Get the file_id from the song's cover field
            file_id = song.cover.grid_id

            # Retrieve the file from GridFS
            if not fs.exists(file_id):
                return Response(
                    {"error": "Cover image not found"}, status=status.HTTP_404_NOT_FOUND
                )

            grid_file = fs.get(file_id)

            # Create a response with the image data
            response = HttpResponse(
                grid_file.read(), content_type=grid_file.content_type or "image/jpeg"
            )

            return response

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SongCreateView(APIView):
    """Create a new song with file uploads"""

    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SongCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            song = serializer.save()
            if isinstance(song, ValueError):
                return Response(
                    {"error": str(song)}, status=status.HTTP_400_BAD_REQUEST
                )

            # Return the created song with all details including URLs
            response_serializer = EnhancedSongSerializer(
                song, context={"request": request}
            )
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SongBulkDestroyView(APIView):
    permission_classes = [AllowAny]
    # permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        print("REQUEST DATA: ", request.data.get("song_ids"))
        song_ids = request.data.get("song_ids", [])

        if not isinstance(song_ids, list):
            return Response(
                {"error": "Invalid data format. 'song_ids' must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not song_ids:
            return Response(
                {"error": "No song IDs provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        success = Song.delete_many(song_ids)
        if success:
            return Response(
                {"message": "Songs deleted successfully"},
                status=status.HTTP_204_NO_CONTENT,
            )
        else:
            return Response(
                {"error": "No songs found or already deleted"},
                status=status.HTTP_404_NOT_FOUND,
            )


class SongSearchView(APIView):
    permission_classes = [AllowAny]

    def searchUserAndSortByListen(self, request, query):
        # Filter users
        users = User.search(query)

        user_list = []

        for user in users:
            # Get songs of the user
            songs = Song.findAllByUser(user.id)
            # Parse query_set to JSON
            songs_serializer = EnhancedSongSerializer(
                songs, many=True, context={"request": request}
            )
            # Calculate total of listens of user
            total_listen = sum(
                (song.get("listened_at_count", 0)) for song in songs_serializer.data
            )

            # Parse query_set to JSON
            user_data = UserDetailSerializer(
                user, context={"request": request}).data

            user_data["total_listen"] = total_listen

            user_list.append(user_data)

        sorted_users = sorted(
            user_list, key=lambda x: x["total_listen"], reverse=True)

        return sorted_users

    def searchSongAndSortByListen(self, request, query, genre):
        songs = Song.search(query, genre)

        songs_data = EnhancedSongSerializer(
            songs, many=True, context={"request": request}
        ).data

        sorted_songs = sorted(
            songs_data, key=lambda x: x["listened_at_count"], reverse=True
        )

        return sorted_songs

    def searchPlaylistAndSortByListen(self, request, query):
        playlists = Playlist.search(query)

        playlist_with_listen_data = []

        for playlist in playlists:
            # Chỉ lấy playlist có bài hát
            if len(playlist.songs) == 0:
                continue

            playlist_data = PlaylistSerializer(
                playlist, context={"request": request}
            ).data

            total_listen = sum(
                (song.get("listened_at_count", 0))
                for song in playlist_data.get("songs", [])
            )

            playlist_data["total_listen"] = total_listen

            if playlist_data["is_favorite"] == False:
                playlist_with_listen_data.append(playlist_data)

        sorted_playlists = sorted(
            playlist_with_listen_data, key=lambda x: x["total_listen"], reverse=True
        )

        return sorted_playlists

    def get(self, request):
        query = request.query_params.get("query", "").strip()
        search_type = request.query_params.get("type", "All").strip()
        search_genre = request.query_params.get("genre", "").strip()

        user_id = request.query_params.get("user_id", "").strip()
        print("user_id", user_id)
        if user_id and search_type == "User":
            try:
                user_songs = Song.objects.filter(user=user_id, deleted_at=None)
                song_serializer = EnhancedSongSerializer(
                    user_songs, many=True, context={"request": request}
                )
                return Response(
                    {"songs_by_user": song_serializer.data}, status=status.HTTP_200_OK
                )
            except User.DoesNotExist:
                return Response(
                    {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
                )

        response = {
            "users": [],
            "songs": [],
            "playlists": [],
        }

        if not query:
            return Response({}, status=status.HTTP_200_OK)

        if search_type == "All":
            response["users"] = self.searchUserAndSortByListen(request, query)
            response["songs"] = self.searchSongAndSortByListen(
                request, query, search_genre
            )
            response["playlists"] = self.searchPlaylistAndSortByListen(
                request, query)
        elif search_type == "Users":
            response["users"] = self.searchUserAndSortByListen(request, query)
        elif search_type == "Songs" or (search_type == "Genres" and search_genre):
            response["songs"] = self.searchSongAndSortByListen(
                request, query, search_genre
            )
        elif search_type == "Playlists":
            response["playlists"] = self.searchPlaylistAndSortByListen(
                request, query)

        return Response(
            response,
            status=status.HTTP_200_OK,
        )
