# ==========================================================
# Audience Segmentation - Trainer Service Dockerfile
# Lean python:3.11-slim, non-root user, pinned dependencies
# ==========================================================
FROM python:3.11-slim

# Prevent python from buffering stdout/stderr and writing pyc files
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Create non-root user and group
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1001 appuser

WORKDIR /app

# Install pinned dependencies
COPY trainer/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source code
COPY trainer/ /app/trainer/

# Create target directories with correct permissions for non-root user
RUN mkdir -p /models /app/models /app/trainer/data && \
    chown -R appuser:appgroup /app /models

USER appuser

# Execute training pipeline and persist artifacts to /models
CMD ["python", "-m", "trainer.train", "--output-dir", "/models"]
