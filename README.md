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
- `frontend/` — HTML/JS client to request points, estimate pi in the browser, and show the result.
- `Dockerfile` — Multi-stage build that compiles and ships the backend binary.

Container build/run
-------------------

```bash
docker build -t pi-estimator .
docker run -p 3000:3000 pi-estimator
```

Running locally
---------------
Requires the latest stable Rust toolchain (tested with rustc 1.91).

```bash
cd backend
cargo run
```

The server listens on http://localhost:3000. Visit that URL to load the minimal frontend, enter a point count, and see the estimated pi.

App behavior
-----------------
- User can adjust the requested number of points in the input field.
- The backend generates random points.
- The frontend calculates pi from the returned points and displays the estimate and response time.

Running tests
-------------

```bash
cd backend
cargo test
```

Endpoint
--------
- `GET /points?n=<N>` → streams random points as little‑endian `u64` pairs in binary (`application/octet-stream`).
	- Provide `n` to receive a finite payload (`N` points → `N * 16` bytes).
	- Omit `n` to keep receiving points until the client closes the connection.
