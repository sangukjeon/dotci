"""가입할 때 서버가 지어 주는 닉네임 (사용자가 직접 정하지 않음).

예: "조용한 다람쥐 42". 실명·아이디가 쪽지에 드러나지 않게 하기 위함.
최대 12자 (users.nickname 칼럼 길이). 겹치면 숫자만 다시 뽑는다.
"""

import secrets

ADJECTIVES = [
    "조용한", "부지런한", "느긋한", "용감한", "다정한", "씩씩한", "엉뚱한", "꼼꼼한",
    "명랑한", "차분한", "든든한", "반짝이는", "졸린", "배고픈", "호기심많은", "수줍은",
]
ANIMALS = [
    "다람쥐", "고양이", "강아지", "토끼", "부엉이", "펭귄", "수달", "고슴도치",
    "판다", "여우", "햄스터", "참새", "거북이", "코알라", "두더지", "알파카",
]


def random_nickname() -> str:
    adjective = secrets.choice(ADJECTIVES)
    animal = secrets.choice(ANIMALS)
    number = secrets.randbelow(90) + 10  # 10~99
    name = f"{adjective} {animal} {number}"
    # 12자를 넘으면 형용사를 빼고 짧게
    return name if len(name) <= 12 else f"{animal} {number}"
