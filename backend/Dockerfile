FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libffi-dev \
    chromium \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /root/.cache

RUN mkdir -p /data && chown -R nobody:nogroup /data

COPY requirements.txt .
RUN pip install --no-cache-dir --no-compile gunicorn \
    && pip install --no-cache-dir --no-compile -r requirements.txt \
    && rm -rf /root/.cache

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "mkdir -p /data && gunicorn -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 --bind 0.0.0.0:5000 --access-logfile - --error-logfile - app:app"]
