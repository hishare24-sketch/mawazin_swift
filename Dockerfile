# ===== الواجهة (Vue) → بناء Vite ثم تقديم عبر nginx =====
# تُبنى مع VITE_* من docker-compose؛ تعمل خلف نفس الأصل مع /api عبر البروكسي.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html env.d.ts tsconfig.json tsconfig.node.json vite.config.ts \
     tailwind.config.js postcss.config.js ./
COPY public ./public
COPY src ./src

# DOCKER=1 → base path = / (انظر vite.config.ts)
ARG DOCKER=1
ARG VITE_APP_NAME="منظومة التوظيف الذكية"
ARG VITE_USE_REAL_API=true
ARG VITE_BASE_API_URL=/api
ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST=
ARG VITE_REVERB_PORT=
ARG VITE_REVERB_SCHEME=http

ENV DOCKER=$DOCKER \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_USE_REAL_API=$VITE_USE_REAL_API \
    VITE_BASE_API_URL=$VITE_BASE_API_URL \
    VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
