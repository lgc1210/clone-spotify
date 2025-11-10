import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Clock, MoreHorizontal, Check, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { usePlaylist } from "../../contexts/Playlist";
import { usePlayer } from "../../contexts/Player";
import formatTime from "../../utils/formatTime";
import formatTotalDuration from "../../utils/formatTotalDuration";
import SongIcon from "../Icons/SongIcon";
import paths from "../../constants/paths";

const PlaylistDetails = () => {
	const playlist_id = useParams()?.id;
	const [popoverSongId, setPopoverSongId] = useState(null);
	const [savedSongs, setSavedSongs] = useState(new Set());
	const {
		fetchPlaylist,
		playlist,
		loadingPlaylist,
		removeSongFromPlaylist,
		addSongToPlaylist,
	} = usePlaylist();
	const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
	const navigate = useNavigate();

	useEffect(() => {
		fetchPlaylist(playlist_id);
	}, [fetchPlaylist, playlist_id]);

	useEffect(() => {
		if (playlist?.songs) {
			const savedIds = new Set(
				playlist.songs.map((item) => item.song?.id).filter(Boolean)
			);
			setSavedSongs(savedIds);
		}
	}, [playlist]);

	const handlePlaySong = (song, index) => {
		const songs = playlist?.songs?.map((s) => {
			return { ...s.song };
		});

		if (currentSong?.id === song.id) {
			togglePlay();
		} else {
			// Otherwise play the selected song
			playSong(song, songs, index);
		}
	};

	const handlePlayAllSongs = () => {
		const songs = playlist?.songs?.map((s) => {
			return { ...s.song };
		});

		if (songs?.find((s) => s?.id === currentSong?.id)) {
			togglePlay();
		} else {
			if (songs?.length) {
				playSong(
					songs[Math.max(Math.floor(Math.random() * songs?.length), 0)],
					songs
				);
			}
		}
	};

	const toggleSaveToPlaylist = (song_id) => {
		// Toggle saved status
		const newSavedSongs = new Set(savedSongs);

		if (newSavedSongs.has(song_id)) {
			// Remove from playlist
			newSavedSongs.delete(song_id);
			removeSongFromPlaylist(song_id);
		} else {
			// Add to playlist
			newSavedSongs.add(song_id);
			// Call addToPlaylist API (you need to implement this in your playlist context)
			const payload = { playlist_id: playlist.id, song_id };
			addSongToPlaylist(payload);
		}

		setSavedSongs(newSavedSongs);
	};

	const handleRemoveFromPlaylist = (song_id) => {
		removeSongFromPlaylist(playlist.id, song_id);

		// Update local state
		const newSavedSongs = new Set(savedSongs);
		newSavedSongs.delete(song_id);
		setSavedSongs(newSavedSongs);
		removeSongFromPlaylist(song_id);

		// Close popover
		setPopoverSongId(null);
	};

	const togglePopover = (songId) => {
		setPopoverSongId(popoverSongId === songId ? null : songId);
	};

	const handleNavigate = (item, type) => {
		navigate(paths.details + `?detailsId=${item?.id}&type=${type}`);
	};

	if (loadingPlaylist) {
		return (
			<div className='flex-1 flex items-center justify-center h-screen'>
				<div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500'></div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gradient-to-b from-green-800 to-black text-white'>
			{/* Header Section with album info */}
			<div className='flex flex-col md:flex-row p-6 items-center md:items-end space-y-6 md:space-y-0 md:space-x-6 bg-gradient-to-b from-green-800 to-transparent pb-12'>
				<div className='shrink-0 h-44 md:h-60 w-44 md:w-60 flex items-center justify-center'>
					{playlist?.cover ? (
						<img
							src={
								playlist?.cover !== "<GridFSProxy: <no file> (None)>" &&
								playlist?.cover
									? playlist.cover
									: "/api/placeholder/200/200"
							}
							alt={`${playlist?.name || "Playlist"} Cover`}
							className='rounded w-full h-full shadow-2xl object-center object-cover'
						/>
					) : (
						<div className='rounded bg-white/30 w-full h-full flex items-center justify-center'>
							<SongIcon className='text-white/50 w-1/2 h-1/2' />
						</div>
					)}
				</div>

				<div className='flex flex-col'>
					<span className='text-sm font-medium'>Playlist</span>
					<h1 className='text-5xl md:text-7xl font-bold mb-6'>
						{playlist?.name || "Loading..."}
					</h1>
					<div className='flex items-center space-x-2 text-sm'>
						<div className='flex items-center cursor-pointer gap-3'>
							<img
								className='w-8 h-8 rounded-full hover:cursor-pointer'
								src={
									playlist?.user?.image ||
									"https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png"
								}
								alt=''
								onClick={() => handleNavigate(playlist?.user, "user")}
							/>
							<span
								className='font-bold hover:underline hover:cursor-pointer'
								onClick={() => handleNavigate(playlist?.user, "user")}>
								{playlist?.user?.name || "Unknown User"}
							</span>
						</div>
						<span>•</span>
						<span>
							{new Date(playlist?.created_at || Date.now()).getFullYear()}
						</span>
						<span>•</span>
						<span>
							{playlist?.songs?.length || 0} songs,{" "}
							{formatTotalDuration(playlist?.songs)}
						</span>
					</div>
					{playlist?.desc && (
						<p className='mt-2 text-sm text-gray-300'>{playlist.desc}</p>
					)}
				</div>
			</div>

			{/* Controls Section */}
			<div className='backdrop-blur-3xl'>
				<div className='px-6 py-4 flex items-center space-x-4'>
					<button
						className='w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-black hover:scale-105 transition cursor-pointer'
						onClick={handlePlayAllSongs}>
						{isPlaying &&
						currentSong &&
						playlist?.songs?.some(
							(item) => item.song?.id === currentSong.id && isPlaying
						) ? (
							<Pause size={24} fill='black' />
						) : (
							<Play size={24} fill='black' />
						)}
					</button>

					<button className='text-gray-400 hover:text-white cursor-pointer'>
						<MoreHorizontal size={24} />
					</button>
				</div>

				{/* Songs Table */}
				<div className='px-6 mt-4'>
					<div className='flex justify-between text-gray-400 border-b border-gray-800 px-4 py-2 text-sm'>
						<div className='w-8 text-center'>#</div>
						<div className='flex-1 ms-1'>Title</div>
						<div className='w-20'></div>
						<div className='w-20 text-right'>
							<Clock size={16} className='ms-auto' />
						</div>
					</div>

					<div className='divide-y divide-gray-800'>
						{playlist?.songs?.map((item, index) => (
							<div
								key={item.song?.id || index}
								className='flex items-center px-4 py-3 hover:bg-gray-800 rounded group cursor-pointer'>
								{/* Play/Pause or Index */}
								<div className='w-8 text-center flex items-center justify-center me-1'>
									<div className='group-hover:hidden block text-gray-400 group-hover:text-white'>
										{index + 1}
									</div>
									<button
										className='hidden group-hover:flex items-center justify-center hover:scale-105 transition'
										onClick={() => handlePlaySong(item.song, index)}>
										{isPlaying && currentSong?.id === item?.song?.id ? (
											<Pause
												size={16}
												fill='white'
												className='cursor-pointer'
											/>
										) : (
											<Play size={16} fill='white' className='cursor-pointer' />
										)}
									</button>
								</div>

								{/* Song Title & Artist */}
								<div className='flex-1'>
									<div
										className={`font-medium hover:underline cursor-pointer ${
											currentSong?.id === item?.song?.id
												? "text-green-500"
												: "text-white"
										}`}>
										<p onClick={() => handleNavigate(item?.song, "song")}>
											{item.song?.title || "Unknown Title"}
										</p>
									</div>
									<div
										className='text-sm text-gray-400 hover:underline hover:text-white cursor-pointer'
										onClick={() => handleNavigate(item?.song?.user, "user")}>
										{item.song?.user?.name || "Unknown Artist"}
									</div>
								</div>

								{/* Save/Check Button */}
								<div className='w-10 flex items-center justify-center'>
									<button
										className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-green-900/30 transition cursor-pointer'
										onClick={() => toggleSaveToPlaylist(item.song?.id)}>
										{savedSongs.has(item.song?.id) ? (
											<Check size={16} className='text-green-500' />
										) : (
											<Check size={16} className='text-gray-500' />
										)}
									</button>
								</div>

								{/* More Options */}
								<div className='w-10 flex items-center justify-center relative'>
									<button
										className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-700 transition cursor-pointer'
										onClick={() => togglePopover(item.song?.id)}>
										<MoreHorizontal size={16} className='text-gray-400' />
									</button>

									{/* Popover Menu */}
									{popoverSongId === item.song?.id && (
										<div className='absolute right-0 top-8 bg-gray-900 rounded shadow-lg py-1 z-10 w-48 cursor-pointer'>
											<button
												className='px-4 py-2 text-sm text-white hover:bg-gray-800 w-full text-left flex items-center gap-2 cursor-pointer'
												onClick={() => handleRemoveFromPlaylist(item.song?.id)}>
												<X size={16} />
												<p className='w-full'>Remove from playlist</p>
											</button>
										</div>
									)}
								</div>

								{/* Duration */}
								<div className='w-20 text-right text-gray-400'>
									{formatTime(item.song?.duration)}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default PlaylistDetails;
