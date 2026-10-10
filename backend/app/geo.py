"""위치 판정 (CLAUDE.md 4장 F4, 8장).

하버사인 공식: 지구를 공으로 보고 위도·경도 두 점 사이 거리(m)를 구한다.
"""

import math

EARTH_RADIUS_M = 6_371_000
MAX_ACCURACY_M = 100  # GPS 정확도가 이보다 나쁘면 판정하지 않음
ACCURACY_BONUS_CAP_M = 25  # 정확도만큼 봐주되, 최대 25m까지만


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def judge_gps(
    center_lat: float, center_lng: float, radius_m: float, lat: float, lng: float, accuracy: float
) -> tuple[bool, str | None, int | None]:
    """(열림 여부, 실패 이유, 거리m). 장소 해제와 가입 시 캠퍼스 확인에 같이 쓴다."""
    if accuracy > MAX_ACCURACY_M:
        return False, "low_accuracy", None
    d = distance_m(lat, lng, center_lat, center_lng)
    allowed = radius_m + min(accuracy, ACCURACY_BONUS_CAP_M)
    if d <= allowed:
        return True, None, round(d)
    return False, "too_far", round(d)
