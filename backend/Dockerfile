FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libffi-dev libnss3 libnspr4 libatk1.0-0 \
    libatk-bridge2.0-0 libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /data && chown -R nobody:nogroup /data

COPY requirements.txt .
RUN pip install --no-cache-dir --no-compile gunicorn \
    && pip install --no-cache-dir --no-compile -r requirements.txt

ENV PLAYWRIGHT_BROWSERS_PATH=/app/ms-playwright
RUN python -m playwright install chromium \
    && rm -rf /root/.cache/ms-playwright

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "mkdir -p /data && gunicorn -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 --bind 0.0.0.0:5000 --access-logfile - --error-logfile - app:app"]
