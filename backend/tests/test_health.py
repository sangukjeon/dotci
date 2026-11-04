def test_health_get(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_health_head(client):
    # 깨우기 모니터(UptimeRobot)는 HEAD로 확인한다
    assert client.head("/api/health").status_code == 200
