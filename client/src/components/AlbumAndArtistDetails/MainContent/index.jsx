import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Button, Spin } from "antd";
import PlayIcon from "../../Icons/PlayIcon";
import PauseIcon from "../../Icons/PauseIcon";
import SongListWrap from "../../SongListWrap";
import { useSong } from "../../../contexts/Song";
import { notify } from "../../Toast";
import { AiOutlinePlusCircle } from "react-icons/ai";
import { AiOutlineArrowDown } from "react-icons/ai";
import { AiOutlineHeart } from "react-icons/ai";
import { AiFillHeart } from "react-icons/ai";
import { usePlaylist } from "../../../contexts/playlist";
import { usePlayer } from "../../../contexts/player";

const MainContent = ({ user = null, song = null }) => {
	const [allSongs, setAllSongs] = useState([]);
	const [loading, setLoading] = useState(false);
	const { fetchSongsByUserId, handleDownload } = useSong();
	const [isFavorited, setIsFavorited] = useState(false);
	const {
		favoritePlaylist,
		fetchFavoritePlaylist,
		addSongToPlaylist,
		removeSongFromPlaylist,
		loadingPlaylists,
	} = usePlaylist();
	const { isPlaying, playSong, currentSong, togglePlay } = usePlayer();

	const fetchSongsByUser = useCallback(async () => {
		try {
			const userId = user?.id || song?.user?.id;
			if (!userId) return;

			setLoading(true);
			const response = await fetchSongsByUserId(userId);
			if (response.status === 200) {
				setAllSongs(response.data.songs_by_user);
			}
		} catch (error) {
			console.log("Errors occur while fetching songs", error.message);
			notify("Error fetching songs", "error");
		} finally {
			setLoading(false);
		}
	}, [fetchSongsByUserId, user?.id, song?.user?.id]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				await fetchSongsByUser();
				await fetchFavoritePlaylist();
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		};

		fetchData();
	}, [user, song, fetchSongsByUser, fetchFavoritePlaylist]);

	// Check if song is in favorite playlist
	useEffect(() => {
		if (favoritePlaylist && song) {
			const found = favoritePlaylist.songs?.some(
				(entry) => entry.song?.id === song.id
			);
			setIsFavorited(found);
		}
	}, [favoritePlaylist, song]);

	const handleClickDownloadBtn = async (e) => {
		handleDownload(e, song?.audio_url, song?.title, song?.user?.name);
	};

	// Handle favorite/unfavorite
	const handleToggleFavorite = async () => {
		try {
			setLoading(true);

			if (isFavorited) {
				// If already favorited, remove from playlist
				await removeSongFromPlaylist(song?.id);
			} else {
				// If not favorited, add to playlist
				await addSongToPlaylist({
					playlist_id: favoritePlaylist?.id,
					song_id: song?.id,
					checkFavorite: true, // Flag to use proper checking logic
				});
			}

			// Let the effect handle state update when playlist refreshes
		} catch (error) {
			console.error("Error toggling favorite status:", error);
		} finally {
			setLoading(false);
		}
	};

	const handlePlaySong = () => {
		if (allSongs?.find((s) => s?.id === currentSong?.id)) {
			togglePlay();
		} else if (allSongs?.length > 0) {
			playSong(allSongs[0], allSongs);
		}
	};

	const handleAddSongToPlaylist = async (song_id) => {
		await addSongToPlaylist({
			song_id,
		});
	};

	const isLoading = loading || loadingPlaylists;

	return (
		<Suspense
			fallback={
				<Spin spinning tip='Please wait...' fullscreen size='large'></Spin>
			}>
			<div>
				<div className='2xl:max-w-10/12 w-full 2xl:px-0 px-10'>
					<div className='w-full py-6 flex items-center justify-start gap-5 mb-6'>
						{/* Play button */}
						{allSongs?.length > 0 && (
							<div
								className='
									size-12 bg-[#1ED760] 
									hover:bg-[#3BE477] hover:scale-[1.03] 
									shadow-lg rounded-full flex items-center justify-center'>
								<Button
									type='primary'
									icon={
										isPlaying ? (
											<PauseIcon
												width='30'
												height='30'
												className='!bg-[#1ED760]'
											/>
										) : (
											<PlayIcon width='30' height='30' />
										)
									}
									className='!rounded-full !text-3xl !text-center !mx-auto !w-full !bg-transparent !text-black'
									onClick={handlePlaySong}
								/>
							</div>
						)}

						{song && (
							<>
								<AiOutlinePlusCircle
									className='text-5xl text-white hover:scale-[1.1] cursor-pointer'
									onClick={() => handleAddSongToPlaylist(song?.id)}
								/>

								{/* Heart icon with loading state handling */}
								{isLoading ? (
									<Spin className='text-5xl' />
								) : isFavorited ? (
									<AiFillHeart
										className='text-5xl text-white hover:scale-[1.1] cursor-pointer'
										onClick={handleToggleFavorite}
									/>
								) : (
									<AiOutlineHeart
										className='text-5xl text-white hover:scale-[1.1] cursor-pointer'
										onClick={handleToggleFavorite}
									/>
								)}

								<AiOutlineArrowDown
									className='text-5xl text-white hover:scale-[1.1] cursor-pointer'
									onClick={(e) => handleClickDownloadBtn(e)}
								/>
							</>
						)}
					</div>
					<SongListWrap
						songList={allSongs}
						title={`${
							user
								? "Songs by this user"
								: `Other songs by ${song?.user?.name} `
						} `}
					/>
				</div>
			</div>
		</Suspense>
	);
};

export default React.memo(MainContent);
