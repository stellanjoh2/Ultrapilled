FROM python:3.12-slim AS build

# Isso pulls in misaka, a C extension without 3.12 wheels.
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev libffi-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY --from=build /wheels /wheels
RUN pip install --no-cache-dir --no-index /wheels/* && rm -rf /wheels

COPY isso.cfg gate.py app.py ./

RUN useradd --create-home --uid 1000 guestbook && mkdir -p /data && chown guestbook /data
USER guestbook

EXPOSE 8080
# One worker: the gate's rate limits are in-memory and SQLite prefers a single writer.
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "4", "--timeout", "30", "app:application"]
