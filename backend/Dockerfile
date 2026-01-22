# Multi-stage build for smaller image size
FROM python:3.10-slim as builder

WORKDIR /app

# Install dependencies to a virtual environment
COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.10-slim

WORKDIR /app

# Install curl for healthcheck, ffmpeg for video recording, and tzdata for timezone support
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Use virtual environment
ENV PATH="/opt/venv/bin:$PATH"

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Run server
# Note: Running as root for Windows compatibility with volume mounts
# Database initialization happens automatically in main.py startup event
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
