import React, { lazy, Suspense, useRef, useEffect } from "react";
import { useUser } from "../../contexts/User";
import { Spin } from "antd";
import AlbumAndArtistWrap from "../AlbumAndArtistWrap";
import { useAuth } from "../../contexts/Auth";
import { usePlaylist } from "../../contexts/Playlist";
import { useSong } from "../../contexts/Song";
import { notify } from "../Toast";
import SongListWrap from "../SongListWrap";

const Header = lazy(() => import("./Header"));
const Cover = lazy(() => import("./Cover"));
const MainContent = lazy(() => import("./MainContent"));

const songList = [
	{
		id: 1,
		imageUrl: "",
		name: "Mất Kết Nối",
		listeners: "25,661,983",
		duration: "3:27",
	},
	{
		id: 2,
		imageUrl: "",
		name: "Tràn Bộ Nhớ",
		listeners: "9,378,924",
		duration: "3:30",
	},
	{
		id: 3,
		imageUrl: "",
		name: "HÀO QUANG(feat.RHYDER, Dương Mic & Pháp Kiều) HÀO QUANG(feat.RHYDER, Dương Mic & Pháp Kiều)",
		listeners: "2,345,677",
		duration: "4:12",
	},
	{
		id: 4,
		imageUrl: "",
		name: "Pin Dự Phòng",
		listeners: "21,357,833",
		duration: "3:18",
	},
	{
		id: 5,
		imageUrl: "",
		name: "LÀN ƯU TIÊN",
		listeners: "15,113,644",
		duration: "4:05",
	},
	{
		id: 6,
		imageUrl: "",
		name: "Yêu Em 2 Ngày",
		listeners: "3,876,990",
		duration: "2:52",
	},
];

const Profile = () => {
	const contentRef = useRef(null);
	const { user, setUser } = useAuth();
	const [publicPlaylists, setPublicPlaylists] = React.useState([]);
	const { fetchPlaylistsByUser } = usePlaylist();
	const { fetchSongsByUserId } = useSong();
	const [songs, setSongs] = React.useState([]);

	useEffect(() => {
		console.log("User in Profile:", user);
		fetchPublicPlaylists();
		fetchSongs();
	}, []);

	const fetchPublicPlaylists = async () => {
		try {
			const response = await fetchPlaylistsByUser(user?.id);
			if (response && response.status === 200) {
				setPublicPlaylists(response.data);
				console.log("Public playlists:", response.data);
			}
		} catch (error) {
			console.log("Error fetching public playlists", error.message);
			notify("Error fetching public playlists", "error");
		}
	};

	const fetchSongs = async () => {
		try {
			const response = await fetchSongsByUserId(user?.id);
			if (response && response.status === 200) {
				setSongs(response.data.songs_by_user);
				console.log("My songs: ", response.data.songs_by_user);
			}
		} catch (error) {
			console.log("Errors occur while fetching songs", error.message);
			notify("Error fetching songs", "error");
		}
	};

	return (
		<Suspense
			fallback={
				<Spin spinning tip='Please wait...' fullscreen size='large'></Spin>
			}>
			<div className='w-full h-full overflow-y-auto' ref={contentRef}>
				<Header name={user?.name || "Demo"} contentRef={contentRef} />
				<Cover
					user={user}
					playlistCount={publicPlaylists.length}
					songCount={songs.length}
				/>
				<MainContent songList={songList} user={user} setUser={setUser} />
				<div className='mt-10 flex flex-col gap-10'>
					<AlbumAndArtistWrap
						title='Public Playlists'
						list={publicPlaylists}
						type='album'
					/>
				</div>
				<div className='mt-10 flex-col gap-10 mx-auto px-10'>
					<SongListWrap title={`My songs`} songList={songs} />
				</div>
			</div>
		</Suspense>
	);
};

export default Profile;
