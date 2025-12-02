use axum::{body::Body, http::Request};
use http_body_util::BodyExt;
use pi_estimator::build_router;
use tower::ServiceExt;

#[tokio::test]
async fn test_points_endpoint() {
    let app = build_router(None);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/points?n=1000")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(response.status().is_success());

    let body = response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();

    assert_eq!(body.len(), 1000 * 2 * 8);
}