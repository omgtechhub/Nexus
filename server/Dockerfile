# The API image.
#
# Debian slim, not alpine. `onnxruntime-node` — which the voice features load
# through `@huggingface/transformers` — ships prebuilt binaries for glibc only.
# On node:20-alpine (musl) the native module fails to load, so the whole voice
# surface threw at runtime in a container while working fine on the host.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# openssl is Prisma's engine dependency; the slim image does not carry it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# ---

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Speech models, baked into the image rather than downloaded on first use.
#
# Without this the first voice request in a fresh container reached out to
# HuggingFace for ~143 MB, so a cold start took tens of seconds, depended on a
# third party being up, and repeated on every restart because nothing persisted
# the download. Present only if `voice:fetch-model` has been run on the build
# host; the build does not fail without it.
COPY --from=builder /app/.model[s] ./.models

# Product images are written to this directory. The compose file mounts a
# volume over it — without one, every upload is lost on redeploy.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Drop root. Nothing here needs it, and an upload path that writes to disk is
# exactly where that matters.
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `dist/server.js`, which is what `npm run build` actually emits.
#
# This said `dist/index.js` — a file the build has never produced — so the
# container crash-looped on `Cannot find module '/app/dist/index.js'` the first
# time anyone ran the compose stack.
CMD ["node", "dist/server.js"]
