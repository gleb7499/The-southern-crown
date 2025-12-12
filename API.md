# Southern Crown API Documentation

Base URL: `http://localhost:8000`

## Authentication

All API endpoints (except `/auth/login`) require authentication via HttpOnly cookie.

### POST /auth/login

Login and receive JWT token in cookie.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "email": "admin@example.com",
    "is_admin": true
  }
}
```

**Status Codes:**
- `200 OK` - Login successful
- `401 Unauthorized` - Invalid credentials
- `400 Bad Request` - Inactive user

---

### POST /auth/logout

Logout and clear authentication cookie.

**Response:**
```json
{
  "message": "Logout successful"
}
```

---

### GET /auth/me

Get current authenticated user information.

**Response:**
```json
{
  "id": 1,
  "email": "admin@example.com",
  "is_active": true,
  "is_admin": true
}
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Not authenticated

---

## Farms

### GET /api/farms

Get list of all farms with pagination.

**Query Parameters:**
- `skip` (optional, default=0): Number of records to skip
- `limit` (optional, default=100, max=1000): Maximum records to return

**Response:**
```json
[
  {
    "id": 1,
    "name": "Ферма №1"
  },
  {
    "id": 2,
    "name": "Ферма №2"
  }
]
```

---

### POST /api/farms

Create a new farm (admin only).

**Request:**
```json
{
  "name": "Новая ферма"
}
```

**Response:**
```json
{
  "id": 4,
  "name": "Новая ферма"
}
```

**Status Codes:**
- `200 OK` - Created successfully
- `403 Forbidden` - Not admin
- `401 Unauthorized` - Not authenticated

---

## Buildings

### GET /api/buildings

Get list of buildings with optional filtering and pagination.

**Query Parameters:**
- `farm_id` (optional): Filter by farm ID
- `skip` (optional, default=0): Number of records to skip
- `limit` (optional, default=100, max=1000): Maximum records to return

**Response:**
```json
[
  {
    "id": 1,
    "name": "Корпус 1",
    "farm_id": 1
  },
  {
    "id": 2,
    "name": "Корпус 2",
    "farm_id": 1
  }
]
```

---

### POST /api/buildings

Create a new building (admin only).

**Request:**
```json
{
  "name": "Новый корпус",
  "farm_id": 1
}
```

**Response:**
```json
{
  "id": 10,
  "name": "Новый корпус",
  "farm_id": 1
}
```

**Status Codes:**
- `200 OK` - Created successfully
- `403 Forbidden` - Not admin
- `404 Not Found` - Farm not found
- `401 Unauthorized` - Not authenticated

---

## Control Points

### GET /api/control-points/

Get list of control points with filtering and pagination.

**Query Parameters:**
- `farm_ids` (optional): Comma-separated farm IDs (e.g., "1,2,3")
- `building_ids` (optional): Comma-separated building IDs
- `skip` (optional, default=0): Number of records to skip
- `limit` (optional, default=100, max=1000): Maximum records to return

**Response:**
```json
[
  {
    "id": 1,
    "name": "Точка 1",
    "building_id": 1,
    "day_of_development": 11,
    "average_deviation": 5,
    "building_name": "Корпус 1",
    "farm_name": "Ферма №1"
  }
]
```

---

### POST /api/control-points/

Create a new control point.

**Request:**
```json
{
  "name": "Точка контроля 1",
  "building_id": 1,
  "day_of_development": 0,
  "average_deviation": 0
}
```

**Response:**
```json
{
  "id": 7,
  "name": "Точка контроля 1",
  "building_id": 1,
  "day_of_development": 0,
  "average_deviation": 0
}
```

---

### POST /api/control-points/full

Create a complete structure (farm/building/control point) by names (admin only).

**Request:**
```json
{
  "farm_name": "Ферма №5",
  "building_name": "Корпус 1",
  "control_point_name": "Точка А"
}
```

**Response:**
```json
{
  "id": 8,
  "name": "Точка А",
  "building_id": 12,
  "day_of_development": 0,
  "average_deviation": 0
}
```

**Notes:**
- Creates farm if it doesn't exist
- Creates building if it doesn't exist in that farm
- Always creates new control point

---

### GET /api/control-points/{id}

Get a specific control point by ID.

**Response:**
```json
{
  "id": 1,
  "name": "Точка 1",
  "building_id": 1,
  "day_of_development": 11,
  "average_deviation": 5
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Control point not found

---

## Cameras

### GET /api/cameras/

Get list of cameras with optional filtering.

**Query Parameters:**
- `control_point_id` (optional): Filter by control point ID

**Response:**
```json
[
  {
    "id": 1,
    "name": "Камера 1",
    "url": "rtsp://example.com/camera1",
    "control_point_id": 1
  }
]
```

---

### POST /api/cameras/

Create a new camera.

**Request:**
```json
{
  "name": "Новая камера",
  "url": "rtsp://example.com/camera",
  "control_point_id": 1
}
```

**Response:**
```json
{
  "id": 5,
  "name": "Новая камера",
  "url": "rtsp://example.com/camera",
  "control_point_id": 1
}
```

---

### DELETE /api/cameras/{id}

Delete a camera by ID.

**Response:**
```json
{
  "message": "Camera deleted successfully"
}
```

**Status Codes:**
- `200 OK` - Deleted successfully
- `404 Not Found` - Camera not found

---

## Reports

### POST /api/reports/generate

Generate a report with stub chart data.

**Request:**
```json
{
  "farm_ids": [1, 2],
  "building_ids": [1],
  "control_point_ids": [1, 2, 3],
  "indicator": "средний вес",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response:**
```json
{
  "charts": [
    {
      "control_point_name": "Точка контроля 1",
      "days": [1, 2, 3, ..., 30],
      "values": [100, 100.5, 101, ..., 114.5]
    }
  ],
  "overall_deviation": {
    "control_point_name": "Общее отклонение",
    "days": [1, 2, 3, ..., 30],
    "values": [5, 5.1, 5.2, ..., 7.9]
  }
}
```

---

### GET /api/reports/alert

Get critical alerts (stub).

**Response:**
```json
{
  "status": "critical",
  "message": "Критическое снижение массы"
}
```

---

## Health Check

### GET /health

Check if the API is running.

**Response:**
```json
{
  "status": "healthy"
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "detail": "Error message"
}
```

Common status codes:
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Rate Limiting

- Development: 1000 requests per minute per IP
- Production: 100 requests per minute per IP

When rate limit is exceeded, you'll receive a `429` response with `Retry-After` header.

---

## Security Headers

All responses include these security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
