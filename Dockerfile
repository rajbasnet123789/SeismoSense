# ─── Stage 1: Build the Next.js frontend ───
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# ─── Stage 2: Combined Python + Node.js runtime ───
FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Backend ──
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/

# ── Frontend ──
COPY --from=frontend-builder /build/frontend/.next ./frontend/.next
COPY --from=frontend-builder /build/frontend/public ./frontend/public
COPY --from=frontend-builder /build/frontend/package.json ./frontend/
COPY --from=frontend-builder /build/frontend/node_modules ./frontend/node_modules
COPY frontend/next.config.mjs ./frontend/

EXPOSE 3000 8000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
