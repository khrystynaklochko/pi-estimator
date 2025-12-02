use pi_estimator::build_router;
use std::{net::SocketAddr, path::Path};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    let app = build_router(Some(Path::new("frontend")));

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("Listening on http://{}", addr);
    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
