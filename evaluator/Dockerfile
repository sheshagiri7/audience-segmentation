# ==========================================================
# Audience Segmentation - Evaluator Service Dockerfile
# Lean python:3.11-slim, non-root user, pinned dependencies
# ==========================================================
FROM python:3.11-slim

# Prevent python from buffering stdout/stderr and writing pyc files
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Create non-root system user for container security hygiene
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1001 appuser

WORKDIR /app

# Install pinned dependencies
COPY evaluator/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy evaluator module and dataset
COPY evaluator/ /app/evaluator/
COPY trainer/data/user_activity.csv /app/data/user_activity.csv

# Ensure mount directories exist with appropriate non-root permissions
RUN mkdir -p /models /output && \
    chown -R appuser:appgroup /app /models /output

USER appuser

ENV PYTHONPATH=/app \
    MODEL_DIR=/models \
    DATA_PATH=/app/data/user_activity.csv \
    OUTPUT_DIR=/output

# Execute independent evaluation suite against api service
CMD ["python", "-m", "evaluator.evaluate", "--api-url", "http://api:8000"]
