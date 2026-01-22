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

# Install ffmpeg and ffprobe
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Use virtual environment
ENV PATH="/opt/venv/bin:$PATH"

# Create log directory
RUN mkdir -p /app/log

# Copy application code
COPY . .

# Run the service
CMD ["python", "srvc_restream.py"]

