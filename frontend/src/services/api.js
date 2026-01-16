import axios from 'axios';

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate client without response interceptor to avoid infinite loops.
const refreshClient = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

const getRefreshPromise = () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient.post('/auth/refresh').finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Не редиректим на /login при ошибке авторизации на странице логина
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    const isRefreshRequest = error.config?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest) {
      const originalRequest = error.config;
      if (!originalRequest?._retry) {
        originalRequest._retry = true;
        try {
          await getRefreshPromise();
          return api(originalRequest);
        } catch (refreshError) {
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const farmsAPI = {
  getFarms: () => api.get('/api/farms'),
  createFarm: (data) => api.post('/api/farms', data),
  getBuildings: (farmId) => api.get('/api/buildings', { params: { farm_id: farmId } }),
};

export const controlPointsAPI = {
  getControlPoints: (farmIds, buildingIds) => {
    const params = {};
    if (farmIds?.length) params.farm_ids = farmIds.join(',');
    if (buildingIds?.length) params.building_ids = buildingIds.join(',');
    return api.get('/api/control-points/', { params });
  },
  createControlPoint: (data) => api.post('/api/control-points/', data),
  createControlPointFull: (data) => api.post('/api/control-points/full', data),
};

export const camerasAPI = {
  getCameras: (controlPointId) =>
    api.get('/api/cameras/', { params: { control_point_id: controlPointId } }),
  createCamera: (data) => api.post('/api/cameras/', data),
  deleteCamera: (id) => api.delete(`/api/cameras/${id}`),
};

export const reportsAPI = {
  generate: (data) => api.post('/api/reports/generate', data),
  getAlert: () => api.get('/api/reports/alert'),
  getReports: (filters) => {
    const params = {};
    if (filters?.control_point_id) params.control_point_id = filters.control_point_id;
    if (filters?.farm_id) params.farm_id = filters.farm_id;
    return api.get('/api/reports', { params });
  },
};

export default api;
