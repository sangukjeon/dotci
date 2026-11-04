"""공지 푸시 알림 서명 키(VAPID) 한 쌍 만들기.

실행 (backend 폴더에서):  .venv/Scripts/python make_vapid.py
출력된 두 줄을 backend/.env 와 Render 환경변수(Environment 탭)에 붙여 넣는다.
- VAPID_PUBLIC_KEY: 브라우저에 보내도 되는 공개키
- VAPID_PRIVATE_KEY: 비밀키. 절대 Git·화면 코드·채팅에 올리지 않는다.
키를 바꾸면 기존 구독은 모두 무효가 되어 사용자가 알림을 다시 켜야 한다.
"""

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


key = ec.generate_private_key(ec.SECP256R1())
private_raw = key.private_numbers().private_value.to_bytes(32, "big")
public_raw = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)

print(f"VAPID_PUBLIC_KEY={b64url(public_raw)}")
print(f"VAPID_PRIVATE_KEY={b64url(private_raw)}")
