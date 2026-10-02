// R14: 기본 욕설 목록. 공백·숫자·특수문자를 끼워 넣는 우회를 막기 위해
// 한글/자모/영문만 남긴 뒤 부분 일치로 검사한다.
// 일상어와 겹치는 단어(예: "새끼" — "고양이 새끼")는 넣지 않는다.
const BADWORDS = [
  "시발",
  "씨발",
  "씨바",
  "씨빨",
  "시바ㄹ",
  "ㅅㅂ",
  "ㅆㅂ",
  "ㅅ ㅂ",
  "병신",
  "븅신",
  "ㅂㅅ",
  "좆",
  "존나",
  "졸라",
  "개새끼",
  "개새기",
  "개색기",
  "개색끼",
  "미친놈",
  "미친년",
  "미친새",
  "지랄",
  "ㅈㄹ",
  "염병",
  "엿먹어",
  "닥쳐",
  "꺼져",
  "니애미",
  "느금마",
  "fuck",
  "shit",
  "bitch",
];

const normalize = (text: string) =>
  text.toLowerCase().replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-z]/g, "");

const NORMALIZED = [...new Set(BADWORDS.map(normalize))].filter(Boolean);

export function containsBadword(text: string) {
  const target = normalize(text);
  return NORMALIZED.some((word) => target.includes(word));
}
