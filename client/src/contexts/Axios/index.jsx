import React from "react";
import axios from "axios";
import { apis } from "../../constants/apis";
import { notify } from "../../components/Toast";

const AxiosContext = React.createContext();

const instance = axios.create({
	baseURL: import.meta.env.VITE_BASE_URL,
	timeout: 10000,
	headers: { "Content-Type": "application/json" },
});

const Axios = ({ children }) => {
	const [accessToken, setAccessToken] = React.useState(
		() => localStorage.getItem("accessToken") || null
	);
	const [refreshToken, setRefreshToken] = React.useState(
		() => localStorage.getItem("refreshToken") || null
	);

	React.useEffect(() => {
		if (accessToken) {
			localStorage.setItem("accessToken", accessToken);
		}
	}, [accessToken]);

	React.useEffect(() => {
		if (refreshToken) {
			localStorage.setItem("refreshToken", refreshToken);
		}
	}, [refreshToken]);

	React.useEffect(() => {
		const requestInterceptor = instance.interceptors.request.use(
			(config) => {
				if (accessToken) {
					config.headers.Authorization = `Bearer ${accessToken}`;
				} else {
					console.log("No authorization header applied");
				}
				return config;
			},
			(error) => {
				console.log("Request error: ", error);
				return Promise.reject(error);
			}
		);

		const responseInterceptor = instance.interceptors.response.use(
			(response) => {
				console.log("Response:", response);
				return response;
			},
			async (error) => {
				const originalRequest = error.config;

				if (
					error.response?.status === 401 &&
					!originalRequest._retry &&
					originalRequest.url !== apis.auths.logout() &&
					originalRequest.url !== apis.auths.login() &&
					originalRequest.url !== apis.auths.refresh()
				) {
					originalRequest._retry = true;
					try {
						console.log("Attempting token refresh...");
						const storedRefreshToken = localStorage.getItem("refreshToken");

						if (!storedRefreshToken) {
							throw new Error("No refresh token available");
						}

						const response = await instance.post(apis.auths.refresh(), {
							refresh: storedRefreshToken,
						});

						if (response.status === 200) {
							const { access, refresh } = response.data;

							localStorage.setItem("accessToken", access);
							if (refresh) {
								localStorage.setItem("refreshToken", refresh);
								setRefreshToken(refresh);
							}

							setAccessToken(access);
							originalRequest.headers["Authorization"] = `Bearer ${access}`;
							return instance.request(originalRequest);
						}
					} catch (refreshError) {
						console.error(
							"Refresh failed: ",
							refreshError.response?.data || refreshError.message
						);

						// Clear tokens on failed refresh
						localStorage.removeItem("accessToken");
						localStorage.removeItem("refreshToken");
						localStorage.removeItem("user");

						setAccessToken(null);
						setRefreshToken(null);

						// notify("Session expired. Please log in again", "error");
						return Promise.reject(refreshError);
					}
				}
				console.error("Response error: ", error);
				return Promise.reject(error);
			}
		);

		return () => {
			instance.interceptors.request.eject(requestInterceptor);
			instance.interceptors.response.eject(responseInterceptor);
		};
	}, [accessToken]);

	return (
		<AxiosContext.Provider
			value={{
				accessToken,
				setAccessToken,
				refreshToken,
				setRefreshToken,
				instance,
			}}>
			{children}
		</AxiosContext.Provider>
	);
};

const useAxios = () => React.useContext(AxiosContext);

export { instance, useAxios };

export default Axios;
