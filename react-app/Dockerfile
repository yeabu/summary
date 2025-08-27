# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- runtime nginx ----
FROM nginx:1.25
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist .
COPY ../nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
