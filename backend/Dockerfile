# Use official slim Python image
FROM python:3.11-slim

# -------------------------
# Set work directory
# -------------------------
WORKDIR /app

# -------------------------
# Install system dependencies
# -------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# -------------------------
# Copy requirements and install
# -------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# -------------------------
# Copy application code
# -------------------------
COPY . .

# -------------------------
# Environment variables
# -------------------------
ENV PYTHONUNBUFFERED=1

# -------------------------
# Expose port and run app
# -------------------------
EXPOSE 10000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "10000", "--reload"]
