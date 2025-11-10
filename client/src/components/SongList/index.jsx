import React from "react";
import SongItem from "../SongItem";
import { usePlayer } from "../../contexts/player";
import { usePlaylist } from "../../contexts/playlist";

const SongList = ({ songList, playlistId }) => {
	const { playSong } = usePlayer();
	const { addSongToPlaylist } = usePlaylist();

	if (songList?.length === 0) {
		return <p className='text-white'>No songs</p>;
	}

	const handlePlaySong = (song) => {
		playSong(song, songList);
	};

	const handleAddSongToPlaylist = async (song_id) => {
		const payload = { song_id };
		await addSongToPlaylist(payload);
	};

	return (
		<ul className='flex flex-col gap-2'>
			{songList?.map((item, index) => {
				console.log("Item: ", item);
				return (
					<SongItem
						key={item?.id || index}
						item={item}
						songList={songList}
						order={index + 1}
						playlistId={playlistId}
						onPlaySong={() => handlePlaySong(item)}
						onAddSongToPlaylist={() => handleAddSongToPlaylist(item?.id)}
					/>
				);
			})}
		</ul>
	);
};

export default React.memo(SongList);
