# ---- build stage ----
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o backend-server main.go

# ---- run stage ----
FROM alpine:3.18
WORKDIR /app
COPY --from=builder /app/backend-server .
COPY .env .  # 可选，如有
EXPOSE 8080
CMD ["./backend-server"]
