use axum::{
    body::Body,
    extract::Query,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use bytes::Bytes;
use rand::{rngs::ThreadRng, rng, RngCore};
use serde::Deserialize;
use std::{cell::RefCell, convert::Infallible, path::Path};
use tokio::sync::mpsc;
use tokio_stream::{wrappers::UnboundedReceiverStream, StreamExt};
use tower_http::services::ServeDir;

const BYTES_PER_POINT: usize = 8;
const POINTS_PER_CHUNK: usize = 4_096;

thread_local! {
    static RNG: RefCell<ThreadRng> = RefCell::new(rng());
}

#[derive(Debug, Deserialize)]
struct PointParams {
    #[serde(default)]
    n: Option<usize>,
}

async fn get_points(Query(params): Query<PointParams>) -> Response {
    if matches!(params.n, Some(0)) {
        return (
            StatusCode::BAD_REQUEST,
            "Provide n",
        )
            .into_response();
    }

    let (tx, rx) = mpsc::unbounded_channel::<Bytes>();
    let limit = params.n;

    tokio::task::spawn_blocking(move || produce_points(limit, tx));

    let stream = UnboundedReceiverStream::new(rx).map(|chunk| Ok::<Bytes, Infallible>(chunk));
    let body = Body::from_stream(stream);
    (
        [("Content-Type", "application/octet-stream")],
        body,
    )
        .into_response()
}

fn produce_points(limit: Option<usize>, tx: mpsc::UnboundedSender<Bytes>) {
    let mut remaining = limit;

    loop {
        if let Some(0) = remaining {
            break;
        }

        let chunk_points = remaining.map_or(POINTS_PER_CHUNK, |rem| rem.min(POINTS_PER_CHUNK));
        let mut chunk = Vec::with_capacity(chunk_points * BYTES_PER_POINT);

        RNG.with(|rng| {
            let mut rng = rng.borrow_mut();
            for _ in 0..chunk_points {
                chunk.extend_from_slice(&rng.next_u32().to_le_bytes());
                chunk.extend_from_slice(&rng.next_u32().to_le_bytes());
            }
        });

        if tx.send(Bytes::from(chunk)).is_err() {
            break;
        }

        if let Some(rem) = remaining.as_mut() {
            *rem -= chunk_points;
        }

        if remaining.is_none() {
            continue;
        }
    }
}

pub fn build_router(frontend_dir: Option<&Path>) -> Router {
    let app = Router::new().route("/points", get(get_points));

    if let Some(dir) = frontend_dir {
        if dir.exists() {
            return app.fallback_service(ServeDir::new(dir));
        }
    }

    app.fallback(|| async {
        (
            StatusCode::OK,
            "No frontend found",
        )
    })
}
