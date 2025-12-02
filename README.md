Monte Carlo Pi Estimator
=======================

Full‑stack app that estimates pi with a Monte Carlo simulation method: the backend streams random points, the frontend visualizes them in a canvas and shows the running estimate.

Why Rust and Axum
-----------------
- **Async streaming**: Axum + Tokio deliver binary chunks efficiently, which is ideal for Monte Carlo payloads.
- **Safety & performance**: Rust keeps the hot loop in native code with zero‑cost abstractions while avoiding GC pauses.
- **Single binary deploy**: The container ships only the compiled backend plus optional static assets.

Project layout
--------------
- `backend/` — Axum server exposing `/points?n=<N>` and conditionally serving `frontend/` if it exists.
- `backend/src/lib.rs` — Shared router used by both the binary and tests.
- `backend/tests/integration.rs` — Exercises the `/points` stream without needing a running server.
- `Dockerfile` — Multi-stage build that compiles and ships the backend binary.

Container build/run
-------------------

```bash
docker build -t pi-estimator .
docker run -p 8080:8080 pi-estimator
```

Running locally
---------------
Requires the latest stable Rust toolchain (tested with rustc 1.91).

```bash
cd backend
cargo run
```

The server listens on http://localhost:8080. Without a `frontend/` directory the root path returns an informational placeholder.

Running tests
-------------

```bash
cd backend
cargo test
```

Endpoint
--------
- `GET /points?n=<N>` → streams random points as little‑endian `u32` pairs in binary (`application/octet-stream`).
	- Provide `n` to receive a finite payload (`N` points → `N * 8` bytes).
	- Omit `n` to keep receiving points until the client closes the connection.

