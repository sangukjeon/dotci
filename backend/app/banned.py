"""금칙어 검사 (쪽지 content·hint 모두).

띄어쓰기를 지우고 비교해서 "바 보"처럼 띄어 쓴 경우도 잡는다.
목록은 대회 규모에 맞춘 최소한이다. 실사용 중 발견되면 여기에 더한다.
"""

BANNED_WORDS = [
    # 비방·욕설
    "시발", "씨발", "ㅅㅂ", "병신", "ㅂㅅ", "개새", "좆", "존나", "미친놈", "미친년",
    "꺼져", "닥쳐", "바보", "멍청", "찐따", "한남", "한녀",
    # 광고
    "광고", "홍보문의", "오픈채팅", "텔레그램",
]


def find_banned(*texts: str | None) -> str | None:
    """처음 걸린 금칙어를 돌려준다. 없으면 None."""
    for text in texts:
        if not text:
            continue
        squashed = "".join(text.split()).lower()
        for word in BANNED_WORDS:
            if word in squashed:
                return word
    return None
