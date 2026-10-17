FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY store.py app.py ./

RUN useradd --create-home --uid 1000 share && mkdir -p /data && chown share /data
USER share

EXPOSE 8080
# One worker: rate limits + SQLite prefer a single writer.
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "4", "--timeout", "60", "app:application"]
