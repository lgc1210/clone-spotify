from django.urls import path
from apps.playlists.views import (
    GetAllView,
    GetDetailView,
    AddSongToPlayListView,
    RemoveSongFromPlaylistView,
    EditPlaylistView,
    DeletePlaylistView,
    CreatePlaylistView,
    GetPlaylistsByUserIdView,
    FavoritePlaylistByUserIdView,
    SearchView,
)

urlpatterns = [
    path("", GetAllView.as_view(), name="get-all"),
    path("search/", SearchView.as_view(), name="search"),
    path("detail/", GetDetailView.as_view(), name="get-detail"),
    path("songs/add/", AddSongToPlayListView.as_view(),
         name="add-song-to-playlist"),
    path(
        "songs/remove/",
        RemoveSongFromPlaylistView.as_view(),
        name="remove-song-from-playlist",
    ),
    path("edit/", EditPlaylistView.as_view(), name="edit"),
    path("delete/", DeletePlaylistView.as_view(), name="delete"),
    path("create/", CreatePlaylistView.as_view(), name="create"),
    path(
        "user/",
        GetPlaylistsByUserIdView.as_view(),
        name="get-playlists-by-user",
    ),
    path("favorite/", FavoritePlaylistByUserIdView.as_view(),
         name="favorite-by-user"),
]
