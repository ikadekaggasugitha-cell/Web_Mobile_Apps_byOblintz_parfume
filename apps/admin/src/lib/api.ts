import axios from 'axios';

const apiURL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: apiURL || 'http://localhost:5000',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('adminAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (refreshToken) {
          const { data } = await axios.post(
            `${apiURL || 'http://localhost:5000'}/api/auth/refresh`,
            { refreshToken }
          );

          localStorage.setItem('adminAccessToken', data.data.accessToken);
          localStorage.setItem('adminRefreshToken', data.data.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export { api };
export default api;
