FROM node:22-alpine AS builder

WORKDIR /app

COPY jc-frontend/package*.json ./

RUN npm ci

COPY jc-frontend ./

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_ADMIN_API_BASE_URL=/api/admin
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_GOOGLE_OAUTH_CLIENT_ID

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ADMIN_API_BASE_URL=${VITE_ADMIN_API_BASE_URL}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
ENV VITE_GOOGLE_OAUTH_CLIENT_ID=${VITE_GOOGLE_OAUTH_CLIENT_ID}

RUN npm run build


FROM nginx:1.27-alpine

COPY jc-frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
