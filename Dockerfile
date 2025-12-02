FROM rust:1.91 as builder
WORKDIR /app
COPY backend ./backend
RUN cd backend \
	&& cargo test --release \
	&& cargo build --release \
	&& strip target/release/pi-estimator

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/backend/target/release/pi-estimator .
COPY frontend ./frontend
RUN useradd -m appuser
USER appuser
EXPOSE 3000
CMD ["./pi-estimator"]
