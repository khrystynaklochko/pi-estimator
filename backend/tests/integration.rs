#[tokio::test]
async fn test_points_endpoint() {
    let url = "http://localhost:8080/points?n=1000";
    let resp = reqwest::get(url).await.unwrap();
    assert!(resp.status().is_success());
    let body = resp.bytes().await.unwrap();
    assert_eq!(body.len(), 8000);
}