import { useRef, useState, useEffect } from "react";
import PlusCircleIcon from "../Icons/PlusCircleIcon";
import NextIcon from "../Icons/NextIcon";
import PrevIcon from "../Icons/PrevIcon";
import ShuffleIcon from "../Icons/ShuffleIcon";
import VolumnIcon from "../Icons/VolumnIcon";
import SkipForwardIcon from "../Icons/SkipForwardIcon";
import PlayIcon from "../Icons/PlayIcon";
import PauseIcon from "../Icons/PauseIcon";
import { usePlayer } from "../../contexts/Player";
import formatTime from "../../utils/formatTime";
import { Tooltip } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useSong } from "../../contexts/Song";
import { useDownloadedAt } from "../../contexts/DownloadedAt";
import { useAuth } from "../../contexts/Auth";
import { usePlaylist } from "../../contexts/Playlist";
import { Popover } from "antd";
import SongIcon from "../../components/Icons/SongIcon";
import { useNavigate } from "react-router-dom";
import paths from "../../constants/paths";

const NowPlayingBar = () => {
	const [volume, setVolume] = useState(0.5);
	const [doesRepeat, setDoesRepeat] = useState(false);
	const [isShuffled, setIsShuffled] = useState(false);
	const [visible, setVisible] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);

	const audioRef = useRef(null);
	const progressBarRef = useRef(null);

	const { user } = useAuth();
	const { handleDownload } = useSong();
	const { saveDownloadedAt } = useDownloadedAt();
	const { addSongToPlaylist, playlists } = usePlaylist();
	const { currentSong, isPlaying, togglePlay, playNext, playPrevious } =
		usePlayer();

	const handleVisibleChange = (newVisible) => {
		setVisible(newVisible);
	};

	const navigate = useNavigate();

	const handleSongNavigateClick = () => {
		navigate(paths.details + `?detailsId=${currentSong?.id}&type=song`);
	};

	const handleUserNavigateClick = () => {
		navigate(paths.details + `?detailsId=${currentSong?.user.id}&type=user`);
	};

	// Load new song when currentSong changes
	useEffect(() => {
		if (currentSong && audioRef.current) {
			audioRef.current.load();
			audioRef.current.volume = volume;
			setCurrentTime(0);
			setDuration(0);
			audioRef.current.play();
		}
	}, [currentSong]);

	const handleTimeUpdate = () => {
		setCurrentTime(audioRef.current.currentTime);
		setDuration(audioRef.current.duration);
	};

	// Update realtime
	useEffect(() => {
		const audio = audioRef.current;
		audio.addEventListener("timeupdate", handleTimeUpdate);

		return () => {
			audio.removeEventListener("timeupdate", handleTimeUpdate);
		};
	}, []);

	// Play/pause
	useEffect(() => {
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current?.play();
			} else {
				audioRef.current?.pause();
			}
		}
	}, [isPlaying, audioRef]);

	const handleSeek = () => {
		if (audioRef.current && progressBarRef.current) {
			const newTime = Number(progressBarRef.current.value);
			audioRef.current.currentTime = newTime;
			setCurrentTime(newTime);
		}
	};

	const handleEnded = () => {
		togglePlay();
		if (audioRef.current) {
			audioRef.current.currentTime = 0;
		}
		playNext(isShuffled);
	};

	const handleVolumeChange = (event) => {
		const newVolume = parseFloat(event.target.value);
		setVolume(newVolume);
		if (audioRef.current) {
			audioRef.current.volume = newVolume;
		}
	};

	const toggleMute = () => {
		if (volume > 0) {
			// Store current volume before muting
			audioRef.current.dataset.prevVolume = volume;
			setVolume(0);
			if (audioRef.current) {
				audioRef.current.volume = 0;
			}
		} else {
			// Restore previous volume
			const prevVolume = parseFloat(audioRef.current.dataset.prevVolume || 0.5);
			setVolume(prevVolume);
			if (audioRef.current) {
				audioRef.current.volume = prevVolume;
			}
		}
	};

	const toggleShuffle = () => {
		setIsShuffled(!isShuffled);
	};

	const toggleRepeat = () => {
		setDoesRepeat(!doesRepeat);
		if (audioRef.current) {
			audioRef.current.loop = !doesRepeat;
		}
	};

	const handleNext = () => {
		playNext(isShuffled);
	};

	const handlePrev = () => {
		// If we're more than 3 seconds into the song, restart it
		if (audioRef.current && audioRef.current.currentTime > 3) {
			audioRef.current.currentTime = 0;
		} else {
			// Otherwise go to previous song
			playPrevious();
		}
	};

	const handleDownloadSong = async (event) => {
		const downloadPromise = handleDownload(
			event,
			currentSong?.audio_url,
			currentSong?.title,
			currentSong?.user?.name
		);

		const payload = { user_id: user?.id, song_id: currentSong?.id };
		const savePromise = saveDownloadedAt(payload);

		await Promise.all([downloadPromise, savePromise]);
	};

	const handleAddSongToPlaylist = async (playlist_id) => {
		const payload = { playlist_id, song_id: currentSong?.id };
		await addSongToPlaylist(payload);
	};

	return (
		<section className='bg-black h-20 w-full'>
			<div className='grid grid-cols-4 h-full'>
				{/* Song Information */}
				<div className='flex items-center gap-3 w-full'>
					<div className='w-14 h-14 rounded overflow-hidden'>
						{currentSong?.cover_url ? (
							<img
								src={
									currentSong?.cover_url ||
									"https://i.scdn.co/image/ab67616d00004851e1379f9837c5cf0a33365ffb"
								}
								alt='Song thumbnail'
								className='w-full h-full object-center object-cover cursor-pointer'
								onClick={handleSongNavigateClick}
							/>
						) : (
							<span className='bg-white/20 w-full h-full flex items-center justify-center'>
								<SongIcon className='text-white/50' width='32' height='32' />
							</span>
						)}
					</div>
					<div>
						<p
							className='hover:underline text-white uppercase cursor-pointer'
							onClick={handleSongNavigateClick}>
							{currentSong?.title || "SONG TITLE"}
						</p>
						<p
							className='hover:underline text-white/50 uppercase hover:text-white text-xs cursor-pointer'
							onClick={handleUserNavigateClick}>
							{currentSong?.user?.name || "USER"}
						</p>
					</div>
					<div className='flex items-center gap-6'>
						{/* Show playlists */}
						<Popover
							content={
								<ul className='bg-gray-900/5 rounded shadow-lg py-1'>
									<li className='text-white mb-2 text-center'>
										Your playlists
									</li>
									{playlists.map((playlist, index) => {
										return (
											<li
												key={playlist?.id || index}
												className='hover:bg-black/40 cursor-pointer px-2 py-1 rounded my-0.5'
												onClick={() => handleAddSongToPlaylist(playlist?.id)}>
												<div className='flex items-center justify-start gap-2'>
													<span className='flex items-center justify-center rounded'>
														{playlist?.cover ? (
															<img
																src={playlist?.cover}
																alt={playlist?.name || "Cover"}
																className='w-5 h-5 object-center object-cover rounded-sm'
															/>
														) : (
															<SongIcon
																className='text-white/50'
																width='26'
																height='26'
															/>
														)}
													</span>
													<span>
														<p className='text-white'>{playlist.name}</p>
													</span>
												</div>
											</li>
										);
									})}
								</ul>
							}
							open={visible}
							onOpenChange={handleVisibleChange}
							trigger='click'
							placement='bottomLeft'
							destroyTooltipOnHide
							getPopupContainer={(triggerNode) => triggerNode.parentNode}
							color='gray'
							arrow={false}>
							<span style={{ display: "none" }}></span>
							<Tooltip title='Add to playlist'>
								<PlusCircleIcon className='w-4 h-4 text-white/75 cursor-pointer hover:text-white' />
							</Tooltip>
						</Popover>
						{/* Download Icon*/}

						<Tooltip title='Download song'>
							<DownloadOutlined
								className='text-lg !text-white/75 hover:!text-white cursor-pointer'
								onClick={handleDownloadSong}
								disabled={currentSong?.audio_url}
							/>
						</Tooltip>
					</div>
				</div>

				<div className='col-span-2 w-full flex flex-col justify-center items-center gap-2'>
					{/* Action button */}
					<div className='flex items-center gap-8'>
						<Tooltip title='Shuffle'>
							<ShuffleIcon
								width='16'
								height='16'
								className={`text-white/50 hover:text-white cursor-pointer ${
									isShuffled ? "!text-[#3BE477]" : ""
								}`}
								onClick={toggleShuffle}
							/>
						</Tooltip>
						<Tooltip title='Previous song'>
							<PrevIcon
								width='16'
								height='16'
								className='text-white/50 hover:text-white cursor-pointer'
								onClick={handlePrev}
							/>
						</Tooltip>
						{!isPlaying ? (
							<Tooltip title='Play'>
								<PlayIcon
									width='32'
									height='32'
									className={`bg-white rounded-full p-1.5 hover:scale-[1.05] text-black hover:bg-white/90 cursor-pointer ${
										currentSong?.audio_url
											? "pointer-events-auto opacity-100"
											: "pointer-events-none opacity-70"
									}`}
									onClick={togglePlay}
									disabled={!currentSong?.audio_url}
								/>
							</Tooltip>
						) : (
							<Tooltip title='Pause'>
								<PauseIcon
									width='32'
									height='32'
									className={`bg-white rounded-full p-1.5 hover:scale-[1.05] text-black hover:bg-white/90 cursor-pointer ${
										currentSong?.audio_url
											? "pointer-events-auto opacity-100"
											: "pointer-events-none opacity-70"
									}`}
									onClick={togglePlay}
									disabled={!currentSong?.audio_url}
								/>
							</Tooltip>
						)}
						<Tooltip title='Next song'>
							<NextIcon
								width='16'
								height='16'
								className='text-white/50 hover:text-white cursor-pointer'
								onClick={handleNext}
							/>
						</Tooltip>
						<Tooltip title='Repeat'>
							<SkipForwardIcon
								width='16'
								height='16'
								className={`text-white/50 hover:text-white cursor-pointer ${
									doesRepeat ? "!text-[#3BE477]" : ""
								}`}
								onClick={toggleRepeat}
							/>
						</Tooltip>
					</div>

					{/* Progress Bar */}
					<div className='flex items-center justify-center gap-2 w-full px-20'>
						<p className='text-white/70 text-xs'>
							{formatTime(currentTime || 0)}
						</p>
						<input
							ref={progressBarRef}
							type='range'
							min='0'
							step='0.01'
							max={duration.toString()}
							value={currentTime}
							onChange={handleSeek}
							className='w-full h-1 accent-[#009634] cursor-pointer'
						/>
						{/* Hidden audio element for audio playback */}
						<audio
							ref={audioRef}
							src={currentSong?.audio_url}
							type='audio/mp3'
							onEnded={handleEnded}
						/>
						<p className='text-white/70 text-xs'>{formatTime(duration || 0)}</p>
					</div>
				</div>

				{/* Volume Bar */}
				<div className='flex items-center justify-center gap-3'>
					<Tooltip title={`${volume === 0 ? "Unmute" : "Mute"}`}>
						<VolumnIcon
							volume={`${
								volume >= 0.5
									? "high"
									: volume < 0.5 && volume > 0
									? "medium"
									: "off"
							}`}
							width='16'
							height='16'
							className='text-white/50 hover:text-white cursor-pointer'
							onClick={toggleMute}
						/>
					</Tooltip>
					<Tooltip title={`${Math.floor(volume * 100)}%`}>
						<input
							type='range'
							min='0'
							max='1'
							step='0.01'
							value={volume}
							onChange={handleVolumeChange}
							className='outline-none border-none h-1 accent-[#009634] cursor-pointer'
						/>
					</Tooltip>
				</div>
			</div>
		</section>
	);
};

export default NowPlayingBar;
