"""너무 쉬운 비밀번호 막기 (가입할 때).

유출 사고 목록에 자주 나오는 비밀번호, 아이디가 들어간 비밀번호, 같은 글자·순서대로 누른 글자를 막는다.
목록은 서버에만 둔다 (화면 코드에 넣으면 누구나 볼 수 있어서).
"""

# 유출 사고에서 가장 많이 쓰인 비밀번호(8자 이상)와 우리 서비스 이름이 들어간 것
COMMON = {
    "12345678", "123456789", "1234567890", "12341234", "11111111", "00000000", "88888888",
    "87654321", "11223344", "123123123", "1q2w3e4r", "1q2w3e4r5t", "q1w2e3r4", "1qaz2wsx",
    "qwer1234", "qwerty12", "qwerty123", "qwertyuiop", "asdf1234", "asdfghjkl", "zxcvbnm1",
    "password", "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "p@ssword",
    "iloveyou", "iloveyou1", "sunshine", "princess", "football", "baseball", "superman",
    "welcome1", "letmein1", "abcd1234", "abc12345", "a1234567", "aa123456", "admin123",
    "administrator", "computer", "internet", "starwars", "whatever", "trustno1", "dragon12",
    "korea123", "sarang12", "saranghae", "dotci123", "dotci-demo", "dotcidemo", "woosong1",
    "woosong123", "woosong2026", "test1234", "testtest", "qwe12345", "zaq12wsx", "1234qwer",
}

# 키보드·숫자를 차례대로 누른 것
SEQUENCES = ("0123456789", "9876543210", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm")


def weak_reason(username: str, password: str) -> str | None:
    """너무 쉬우면 이유(common / has_username / repeated / sequence), 괜찮으면 None."""
    pw = password.lower()
    if pw in COMMON:
        return "common"
    if len(username) >= 3 and username.lower() in pw:
        return "has_username"
    if len(set(pw)) <= 2:  # aaaaaaaa, abababab
        return "repeated"
    if any(pw in seq for seq in SEQUENCES):
        return "sequence"
    return None
