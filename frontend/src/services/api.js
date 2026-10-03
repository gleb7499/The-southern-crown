import axios from 'axios';

// GitHub Pages demo mode: no backend available, serve baked-in demo data.
export const IS_DEMO =
  (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) ||
  import.meta.env.VITE_DEMO === '1';

const DEMO_FARMS = [
  { id: 1, name: 'Ферма №1' },
  { id: 2, name: 'Ферма №2' },
  { id: 3, name: 'Ферма №3' },
];

const DEMO_POINTS = [];
const DEMO_CAMERAS = [];
let cameraId = 1;
[1, 2, 3].forEach((farmId) => {
  [1, 2].forEach((frameIdx) => {
    [1, 2].forEach((pointIdx) => {
      const id = (farmId - 1) * 4 + (frameIdx - 1) * 2 + pointIdx;
      DEMO_POINTS.push({
        id,
        name: `Точка ${pointIdx}`,
        frame_name: `Корпус ${frameIdx}`,
        farm_id: farmId,
      });
      DEMO_CAMERAS.push(
        {
          id: cameraId++,
          name: 'Камера 1',
          url: `https://example.com/stream/${farmId}/${frameIdx}/${pointIdx}/1`,
          farm_id: farmId,
          control_point_id: id,
        },
        {
          id: cameraId++,
          name: 'Камера 2',
          url: `https://example.com/stream/${farmId}/${frameIdx}/${pointIdx}/2`,
          farm_id: farmId,
          control_point_id: id,
        }
      );
    });
  });
});

const DEMO_REPORT_DATES = ['2026-09-17', '2026-09-20', '2026-09-23', '2026-09-26', '2026-09-28', '2026-09-30', '2026-10-02'];
const DEMO_REPORT_GRAMS = [55, 275, 527, 705, 923, 1104, 1250];
const DEMO_REPORTS = {};
DEMO_POINTS.forEach((p) => {
  DEMO_REPORTS[p.id] = DEMO_REPORT_DATES.map((date, i) => ({
    id: p.id * 100 + i,
    date,
    gram: DEMO_REPORT_GRAMS[i] + (p.id % 5) * 17,
    farm_id: p.farm_id,
    control_point_id: p.id,
  }));
});

if (IS_DEMO) {
  // ReportSection calls fetch('/api/reports/...') directly — intercept it.
  const origFetch = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    if (typeof url === 'string' && url.startsWith('/api/reports/')) {
      const cp = new URL(url, window.location.origin).searchParams.get('control_point_id');
      const body = JSON.stringify(DEMO_REPORTS[cp] || []);
      return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return origFetch(url, opts);
  };
}

const ok = (data) => Promise.resolve({ data });

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for handling authentication errors
// On 401 redirect to /login (except the login request itself)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    // When the access_token expires (401) redirect to the login page
    if (error.response?.status === 401 && !isLoginRequest) {
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

const DEMO_TOKEN_KEY = 'sc-demo-token';
const DEMO_USER = { id: 1, email: 'demo@southern-crown.example', is_admin: true, is_active: true };

export const authAPI = IS_DEMO
  ? {
      login: (email, password) => {
        if (!email || !password) return Promise.reject(new Error('empty credentials'));
        localStorage.setItem(DEMO_TOKEN_KEY, 'demo-' + Date.now());
        return ok({ message: 'demo' });
      },
      logout: () => {
        localStorage.removeItem(DEMO_TOKEN_KEY);
        return ok({ message: 'demo' });
      },
      getMe: () =>
        localStorage.getItem(DEMO_TOKEN_KEY)
          ? ok(DEMO_USER)
          : Promise.reject(new Error('not authenticated')),
    }
  : {
      login: (email, password) => api.post('/auth/login', { email, password }),
      logout: () => api.post('/auth/logout'),
      getMe: () => api.get('/auth/me'),
    };

export const farmsAPI = IS_DEMO
  ? {
      getFarms: () => ok(DEMO_FARMS),
      createFarm: (data) => ok({ id: DEMO_FARMS.length + 1, ...data }),
      getBuildings: (farmId) =>
        ok([...new Set(DEMO_POINTS.filter((p) => String(p.farm_id) === String(farmId)).map((p) => p.frame_name))]),
    }
  : {
      getFarms: () => api.get('/api/farms'),
      createFarm: (data) => api.post('/api/farms', data),
      getBuildings: (farmId) => api.get('/api/buildings', { params: { farm_id: farmId } }),
    };

export const controlPointsAPI = IS_DEMO
  ? {
      getControlPoints: (farmIds) => {
        let points = DEMO_POINTS;
        if (farmIds?.length) {
          const ids = farmIds.map(String);
          points = points.filter((p) => ids.includes(String(p.farm_id)));
        }
        return ok(points);
      },
      createControlPoint: (data) => ok({ id: 1000, ...data }),
      createControlPointFull: (data) => ok({ id: 1000, ...data }),
    }
  : {
      getControlPoints: (farmIds, buildingIds) => {
        const params = {};
        if (farmIds?.length) params.farm_ids = farmIds.join(',');
        if (buildingIds?.length) params.building_ids = buildingIds.join(',');
        return api.get('/api/control-points/', { params });
      },
      createControlPoint: (data) => api.post('/api/control-points/', data),
      createControlPointFull: (data) => api.post('/api/control-points/full', data),
    };

export const camerasAPI = IS_DEMO
  ? {
      getCameras: (controlPointId) =>
        ok(DEMO_CAMERAS.filter((c) => String(c.control_point_id) === String(controlPointId))),
      createCamera: (data) => ok({ id: 1000, ...data }),
      deleteCamera: () => ok({ message: 'demo' }),
    }
  : {
      getCameras: (controlPointId) =>
        api.get('/api/cameras/', { params: { control_point_id: controlPointId } }),
      createCamera: (data) => api.post('/api/cameras/', data),
      deleteCamera: (id) => api.delete(`/api/cameras/${id}`),
    };

export const reportsAPI = IS_DEMO
  ? {
      generate: () => ok({ message: 'demo' }),
      getAlert: () => ok(null),
      getReports: (filters) => ok(DEMO_REPORTS[filters?.control_point_id] || []),
    }
  : {
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
