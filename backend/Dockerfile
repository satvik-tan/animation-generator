FROM python:3.11-slim

# Prevent Python from writing pyc files
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (psycopg2, Manim, FFmpeg, LaTeX, Cairo, Pango)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev pkg-config \
    libcairo2-dev libpango1.0-dev ffmpeg \
    texlive-base texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app/ ./app

# Copy Alembic configuration
COPY alembic.ini .
COPY alembic/ ./alembic/

# Create startup script that runs both API and worker
COPY start.sh .
RUN chmod +x start.sh

# Expose FastAPI port
EXPOSE 8000

CMD ["./start.sh"]
