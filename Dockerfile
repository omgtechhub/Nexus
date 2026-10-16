# The frontend image: the built SPA, served by NGINX.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Baked in at build time, because Vite inlines them into the bundle — setting
# them in the compose `environment:` block does nothing, the build has already
# happened. `/api` is relative, so it resolves against whatever origin serves
# the page and nginx.conf proxies it on.
ARG VITE_API_URL=/api
ARG VITE_BASE=/
ARG VITE_APP_NAME="Nexus Commerce"
ARG VITE_PAYSTACK_PUBLIC_KEY=
ARG VITE_FLUTTERWAVE_PUBLIC_KEY=
ARG VITE_WHATSAPP_NUMBER=
ARG VITE_GOOGLE_CLIENT_ID=

ENV VITE_API_URL=$VITE_API_URL \
    VITE_BASE=$VITE_BASE \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_PAYSTACK_PUBLIC_KEY=$VITE_PAYSTACK_PUBLIC_KEY \
    VITE_FLUTTERWAVE_PUBLIC_KEY=$VITE_FLUTTERWAVE_PUBLIC_KEY \
    VITE_WHATSAPP_NUMBER=$VITE_WHATSAPP_NUMBER \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# ---

FROM nginx:alpine AS runner

# The SPA fallback and the /api proxy live here. Without this file nginx serves
# a bare directory: deep links 404 and every API call returns the index page.
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
