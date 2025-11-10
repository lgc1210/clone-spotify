import { BrowserRouter } from "react-router-dom";
import "./index.css";
import AppRoutes from "./routes/AppRoutes";

import Auth from "./contexts/Auth";
import Toast from "./components/Toast";
import Axios from "./contexts/Axios";
import PlayerProvider from "./contexts/player";
import SongProvider from "./contexts/Song";
import UserProvider from "./contexts/User";
import ChatProvider from "./contexts/Chat";
import GenreProvider from "./contexts/genre";
import SearchProvider from "./contexts/Search";
import DownloadedProvider from "./contexts/DownloadedAt";
import ListenedProvider from "./contexts/ListenedAt";
import PlaylistProvider from "./contexts/playlist";

const App = () => {
	return (
		<BrowserRouter>
			<Axios>
				<Auth>
					<ListenedProvider>
						<PlayerProvider>
							<UserProvider>
								<SongProvider>
									<GenreProvider>
										<SearchProvider>
											<ChatProvider>
												<DownloadedProvider>
													<PlaylistProvider>
														<Toast />
														<AppRoutes />
													</PlaylistProvider>
												</DownloadedProvider>
											</ChatProvider>
										</SearchProvider>
									</GenreProvider>
								</SongProvider>
							</UserProvider>
						</PlayerProvider>
					</ListenedProvider>
				</Auth>
			</Axios>
		</BrowserRouter>
	);
};

export default App;
