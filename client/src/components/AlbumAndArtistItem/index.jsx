import { Button } from "antd";
import PlayIcon from "../Icons/PlayIcon";
import { useNavigate } from "react-router-dom";
import paths from "../../constants/paths";
import { usePlayer } from "../../contexts/Player";

const AlbumAndArtistItem = ({ item, type, index, list }) => {
	const navigate = useNavigate();
	const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();

	const handleClickItem = (event, path) => {
		event.stopPropagation();
		if (type === "song" || type === "user")
			navigate(`${path}?detailsId=${item?.id}&type=${type}`);
		else navigate(`${paths.playlist.replace(":id", item?.id)}`);
	};

	const handlePlay = (event) => {
		event.stopPropagation();

		const flatPlaylist =
			list?.flatMap((playlist) => playlist?.songs || []) || [];

		const playListSongs = flatPlaylist
			.map((fp) => fp?.song)
			.filter((song) => song !== undefined);

		// Nếu kiểu là "song" hoặc "album", xử lý logic phát
		if ((type === "song" || type === "album") && item) {
			const currentSongId = currentSong?.id;
			const isCurrentSongPlaying =
				isPlaying && playListSongs?.some((s) => s?.id === currentSongId);

			if (isCurrentSongPlaying) {
				togglePlay();
			} else {
				// Ưu tiên play từ đầu playlist nếu có, fallback về item
				const songToPlay = playListSongs[0] || item;
				const songListToUse = playListSongs.length > 0 ? playListSongs : [item];
				playSong(songToPlay, songListToUse, null);
			}
		}
	};

	const songOrUserDefault =
		type === "song"
			? "https://songdewnetwork.com/sgmedia/assets/images/default-album-art.png"
			: "https://img.freepik.com/premium-vector/user-profile-icon-flat-style-member-avatar-vector-illustration-isolated-background-human-permission-sign-business-concept_157943-15752.jpg?semt=ais_hybrid&w=740";

	return (
		<li
			className='group'
			onClick={(event) => handleClickItem(event, paths.details)}>
			<div className='w-40 flex flex-col items-start justify-center cursor-pointer hover:bg-neutral-800 p-4 rounded-md'>
				{/* Image */}
				<div className='min-h-32 min-w-32 max-w-32 relative'>
					<div className='w-full h-full absolute'>
						<img
							src={
								item?.cover_url || // For songs
								item?.image || // For users
								item?.cover || // For playlists
								songOrUserDefault
							}
							alt={item?.title}
							className={`w-full h-full object-cover object-center ${
								type === "user" ? "rounded-full" : "rounded-lg"
							}`}
						/>
					</div>

					{/* Play button */}
					<div
						className='
							absolute right-2 bottom-2 size-12 bg-[#1ED760]
							opacity-0 translate-y-2
							hover:bg-[#3BE477] hover:scale-[1.05]
							group-hover:translate-y-0 group-hover:opacity-100
							shadow-lg rounded-full flex items-center justify-center
							transition-all duration-500'>
						<Button
							type='primary'
							onClick={handlePlay}
							icon={<PlayIcon width='30' height='30' />}
							className='!rounded-full !text-3xl !text-center !mx-auto !w-full !bg-transparent !text-black'
						/>
					</div>
				</div>

				{/* Texts */}
				<div className='mt-2'>
					<p className='hover:underline text-white text-left truncate text-ellipsis max-w-32 w-full'>
						{item?.title || item?.name}
					</p>
					<p className='text-gray-400 text-sm'>{item?.type}</p>
				</div>
			</div>
		</li>
	);
};

export default AlbumAndArtistItem;
