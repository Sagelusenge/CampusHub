FROM node:22-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY backend/ ./
COPY --from=frontend /build/frontend/dist /app/frontend/dist
RUN mkdir -p /app/backend/uploads/images /app/backend/uploads/preuves \
  && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
