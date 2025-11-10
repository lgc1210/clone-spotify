import { useCallback, useEffect, useState } from "react";
import { X, Music, MessageSquareWarning, Pencil } from "lucide-react";
import Overlay from "../../Overlay";
import { usePlaylist } from "../../../contexts/Playlist";
import _ from "lodash";

const PlaylistModal = ({
	toggle,
	onClose,
	playlistInfo,
	clearPlaylistInfo,
}) => {
	const [id, setId] = useState("");
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");
	const [error, setError] = useState("");
	const [cover, setCover] = useState();
	const [coverFile, setCoverFile] = useState();

	const { createPlaylist, editPlaylist } = usePlaylist();

	useEffect(() => {
		if (playlistInfo) {
			setId(playlistInfo?.id);
			setName(playlistInfo?.name);
			setDesc(playlistInfo?.desc);
		}
	}, [playlistInfo]);

	const validate = useCallback(() => {
		if (_.isEmpty(name.trim())) {
			setError("Name is required");
			return false;
		}
		setError("");
		return true;
	}, [name]);

	useEffect(() => {
		if (!_.isEmpty(name.trim())) {
			setError("");
		}
	}, [name, validate]);

	const handleSave = async () => {
		if (!validate()) return;

		const payload = new FormData();
		payload.append("name", name);
		payload.append("desc", desc);
		payload.append("cover", coverFile);
		if (!playlistInfo?.id) {
			const response = await createPlaylist(payload);
			if (response?.status === 201) clearInfo();
		} else {
			payload.append("playlist_id", id);
			const response = await editPlaylist(payload);
			console.log("Cover file: ", coverFile);
			if (response?.status === 200) handleClose();
		}
	};

	const handleChangeImage = (e) => {
		const file = e.target.files[0];
		setCoverFile(file);
		const coverSrc = URL.createObjectURL(file);
		setCover(coverSrc);
	};

	const clearInfo = () => {
		setCoverFile(null);
		setCover("");
		setName("");
		setDesc("");
		setError("");
	};

	const handleClose = () => {
		clearInfo();
		onClose();
		clearPlaylistInfo();
	};

	return (
		<>
			<Overlay toggle={toggle} setToggle={handleClose} />
			<section className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30'>
				<div className='bg-zinc-900 rounded-lg w-full max-w-lg p-6 text-white'>
					<div className='flex justify-between items-center mb-6'>
						<h2 className='text-2xl font-bold'>Edit details</h2>
						<button className='text-gray-400 hover:text-white cursor-pointer'>
							<X size={24} onClick={handleClose} />
						</button>
					</div>

					{error && (
						<div className='mb-6 py-1 rounded bg-red-700/90 flex items-center gap-2 px-2'>
							<MessageSquareWarning className='text-white' size={16} />
							<p className='text-white'>{error}</p>
						</div>
					)}

					<div className='flex gap-4 mb-4'>
						<div className='w-48 h-auto bg-zinc-800 flex items-center justify-center rounded group relative'>
							{(cover && coverFile) || playlistInfo?.cover ? (
								<img
									src={cover || playlistInfo?.cover}
									alt={coverFile?.name}
									className='object-cover object-center w-full h-full'
								/>
							) : (
								<Music
									size={48}
									className='text-gray-400 block group-hover:hidden'
								/>
							)}
							<div className='group-hover:absolute group-hover:bg-black/50 group-hover:w-full group-hover:h-full flex items-center justify-center'>
								<label htmlFor='image-file' className='cursor-pointer'>
									<Pencil
										size={48}
										className='text-gray-400 hidden group-hover:block'
									/>
								</label>
								<input
									type='file'
									multiple=''
									accept='image/*'
									id='image-file'
									onChange={handleChangeImage}
									hidden
								/>
							</div>
							<input type='file' multiple='' hidden />
						</div>

						<div className='flex-1 h-full'>
							<div className='mb-4'>
								<input
									type='text'
									placeholder='Add a name'
									value={name}
									onChange={(e) => setName(e.target.value)}
									className='w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white'
								/>
							</div>

							<div className='flex'>
								<textarea
									placeholder='Add an optional description'
									value={desc}
									onChange={(e) => setDesc(e.target.value)}
									className='w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white'
									rows={4}
								/>
							</div>
						</div>
					</div>

					<div className='flex justify-end mt-8'>
						<button
							className='bg-white text-black font-bold py-2 px-8 rounded-full hover:bg-gray-200 cursor-pointer'
							onClick={handleSave}>
							Save
						</button>
					</div>

					<p className='text-xs text-gray-400 mt-6'>
						By proceeding, you agree to give Spotify access to the image you
						choose to upload. Please make sure you have the right to upload the
						image.
					</p>
				</div>
			</section>
		</>
	);
};

export default PlaylistModal;
