FROM python:3.11-slim

# Install security updates and curl for docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    MODEL_DIR=/models

WORKDIR /app

# Create non-root system user for container security hygiene
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1001 -d /app -s /sbin/nologin appuser

# Install dependencies first for Docker layer caching
COPY api/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application source code and common library
COPY api/ /app/api/
COPY common/ /app/common/

# Ensure /models mount directory exists and permissions are set
RUN mkdir -p /models && chown -R appuser:appgroup /app /models

USER appuser

EXPOSE 8000

# Built-in health check for container orchestration
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=10 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
