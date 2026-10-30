// ---------- 기본 프로필 (인바디 기록) ----------
const DEFAULT_PROFILE = { nickname: "", height: 170, age: 30, sex: "m", goal: "cut", body: [], notes: "" };
const GOALS = { cut: "다이어트", keep: "유지", bulk: "근성장" };
const ACTIVITY = 1.5;   // 주 3~5회 웨이트

function computeTargets(p){
  const last = latestBody(p) || { weight: 70 };
  const w = last.weight, bf = latestOf(p, "bf");
  const bmr = bf != null
    ? 370 + 21.6 * w * (1 - bf / 100)
    : 10 * w + 6.25 * (p.height || 170) - 5 * (p.age || 30) + (p.sex === "f" ? -161 : 5);
  const tdee = bmr * ACTIVITY;
  const adj = p.goal === "cut" ? -500 : p.goal === "bulk" ? 300 : 0;
  const r = (v, s) => Math.round(v / s) * s;
  const kcal = r(tdee + adj, 50);
  const protein = r(w * (p.goal === "bulk" ? 1.8 : 1.6), 5);
  const fat = r(kcal * 0.25 / 9, 5);
  const carb = r((kcal - protein * 4 - fat * 9) / 4, 5);
  const water = r(w * 33, 100);
  const burn = p.burn || ({ cut: 300, keep: 200, bulk: 150 })[p.goal] || 300;
  return { kcal, protein, carb, fat, water, burn, sodium: 2300, bmr: Math.round(bmr), adj, weight: w, usedBf: bf != null };
}
function latestBody(p){ const b = (p.body || []).slice().sort((a, c) => a.date.localeCompare(c.date)); return b[b.length - 1] || null; }
function latestOf(p, key){ const b = (p.body || []).filter(x => x[key] != null).sort((a, c) => a.date.localeCompare(c.date)); return b.length ? b[b.length - 1][key] : null; }

// ---------- 기본 식단 ----------
// 기본 식단: 누구나 쓰는 일반 음식 (1인분 기준 평균값)
const MEALS = [
  { key: "breakfast", title: "아침", items: [
    { id: "g-egg2", name: "삶은 계란 2개", sub: "약 100g", kcal: 150, protein: 12, carb: 1, fat: 10, sodium: 140 },
    { id: "g-shake", name: "단백질 음료 1팩", sub: "시판 제품 평균 · 250ml", kcal: 120, protein: 20, carb: 5, fat: 3, sodium: 250 },
    { id: "g-greek", name: "그릭요거트", sub: "무가당 100g", kcal: 100, protein: 9, carb: 5, fat: 5, sodium: 40 },
    { id: "g-oat", name: "오트밀", sub: "40g + 물", kcal: 150, protein: 5, carb: 27, fat: 3, sodium: 2 },
  ]},
  { key: "lunch", title: "점심", items: [
    { id: "g-baekban", name: "한식 백반 한 끼", sub: "밥 1공기 + 반찬 · 평균값", kcal: 700, protein: 25, carb: 100, fat: 20, sodium: 1600 },
    { id: "g-salad", name: "닭가슴살 샐러드", sub: "드레싱 포함", kcal: 350, protein: 30, carb: 20, fat: 15, sodium: 600 },
  ]},
  { key: "pre", title: "운동 전 · 1~2시간 전", tip: "가벼운 탄수화물로 힘 채우기 · 공복 운동하면 어지러워요", items: [
    { id: "banana", name: "바나나 1개", sub: "빨리 소화돼서 운동 전에 좋아요", kcal: 100, protein: 1, carb: 25, fat: 0.3, sodium: 1 },
    { id: "g-potato", name: "고구마 1개", sub: "중간 크기 150g", kcal: 190, protein: 2, carb: 45, fat: 0.2, sodium: 30 },
  ]},
  { key: "dinner", title: "운동 후 · 저녁", tip: "단백질 + 탄수화물로 회복 · 운동 끝나고 2시간 안에", items: [
    { id: "g-chicken", name: "닭가슴살 100g", sub: "삶거나 구운 것", kcal: 110, protein: 23, carb: 0, fat: 1.5, sodium: 70 },
    { id: "g-rice", name: "현미밥 1공기", sub: "210g", kcal: 310, protein: 6, carb: 66, fat: 2.5, sodium: 10 },
    { id: "g-tofu", name: "두부 반 모", sub: "150g", kcal: 125, protein: 13, carb: 3, fat: 7, sodium: 10 },
    { id: "g-veg", name: "채소 샐러드", sub: "채소 150g + 드레싱 1스푼", kcal: 80, protein: 2, carb: 10, fat: 4, sodium: 200 },
    { id: "tomato", name: "방울토마토 10개", sub: "약 150g", kcal: 27, protein: 1.3, carb: 6, fat: 0.3, sodium: 7 },
  ]},
  { key: "etc", title: "기타 · 간식", items: [
    { id: "g-nuts", name: "견과류 한 줌", sub: "25g", kcal: 150, protein: 5, carb: 6, fat: 13, sodium: 0 },
    { id: "g-milk", name: "우유 1컵", sub: "200ml", kcal: 130, protein: 6, carb: 10, fat: 7, sodium: 100 },
    { id: "g-apple", name: "사과 1개", sub: "중간 크기", kcal: 95, protein: 0.5, carb: 25, fat: 0.3, sodium: 2 },
  ]},
];
// 예전 기본 식단 — 이미 체크해둔 기록은 그때 값 그대로 남기기
const LEGACY = {
  takefit: { name: "단백질 음료", sub: "얼티브 프로틴 밤맛 250ml", kcal: 115, protein: 21, carb: 1, fat: 3.3, sodium: 320, meal: "breakfast" },
  eggs: { name: "삶은 계란 2개", kcal: 150, protein: 12, carb: 1, fat: 10, sodium: 140, meal: "breakfast" },
  lunch: { name: "회사 점심", sub: "평균값", kcal: 800, protein: 28, carb: 105, fat: 27, sodium: 1800, meal: "lunch" },
  chicken: { name: "닭가슴살 블랙페퍼", sub: "사조 안심 100g", kcal: 115, protein: 25, carb: 1, fat: 1.3, sodium: 430, meal: "dinner" },
  rice: { name: "발아현미밥", sub: "오뚜기 210g", kcal: 305, protein: 7, carb: 65, fat: 2, sodium: 15, meal: "dinner" },
  cabbage: { name: "양배추 + 저당 참깨소스", sub: "양배추 + 소스", kcal: 71, protein: 2.3, carb: 14, fat: 2.3, sodium: 270, meal: "dinner" },
  yogurt: { name: "연두부", sub: "오리엔탈소스 조금", kcal: 74, protein: 4.6, carb: 3, fat: 4.7, sodium: 60, meal: "dinner" },
  nuts: { name: "구운아몬드 20알", sub: "25g", kcal: 150, protein: 6, carb: 6, fat: 12, sodium: 0, meal: "etc" },
};
const PRESET = Object.fromEntries(MEALS.flatMap(m => m.items.map(i => [i.id, i])));
const PRESET_IDS = PRESET;

// ---------- 운동 목록 ----------
const EXERCISES = {
  "가슴": ["팔 돌리기", "가슴 스트레칭", "벤치 프레스", "인클라인 벤치 프레스", "덤벨 프레스", "인클라인 덤벨 프레스", "체스트 프레스 머신", "원 암 체스트 프레스 머신", "펙덱 플라이", "케이블 플라이", "딥스", "푸시업"],
  "등": ["캣카우 스트레칭", "밴드 풀어파트", "바벨 로우", "원 암 덤벨 로우", "티바 로우", "데드리프트", "랫 풀다운", "케이블 암 풀다운", "시티드 케이블 로우 (롱 풀)", "풀업"],
  "어깨": ["팔 돌리기", "밴드 외회전", "오버헤드 프레스", "덤벨 숄더 프레스", "덤벨 사이드 레터럴 레이즈", "프론트 레이즈", "숄더 프레스 머신", "리버스 펙 덱 플라이", "원 암 케이블 레터럴 레이즈", "페이스풀"],
  "하체": ["맨몸 스쿼트", "고관절 스트레칭", "스쿼트", "런지", "루마니안 데드리프트", "힙 쓰러스트", "레그 프레스", "시티드 레그 프레스", "핵 스쿼트", "레그 익스텐션", "레그 컬", "카프 레이즈"],
  "팔": ["손목 돌리기", "바벨 컬", "덤벨 컬", "해머 컬", "오버헤드 익스텐션", "덤벨 오버헤드 익스텐션", "라잉 트라이셉스 익스텐션", "케이블 컬", "트라이셉스 푸시다운"],
  "복근": ["캣카우 스트레칭", "데드버그", "케이블 크런치", "크런치", "레그 레이즈", "행잉 레그 레이즈", "러시안 트위스트", "플랭크"],
  "유산소": ["유산소", "경사 걷기", "러닝머신", "사이클", "스텝밀", "로잉머신", "일립티컬"],
};

// 운동 설명: [그림, 종류, 하는 법 · 자극 부위]
const KINDS = { warm: "몸풀기", free: "프리웨이트", machine: "머신", cable: "케이블", body: "맨몸", cardio: "유산소" };
const EX_INFO = {
  "팔 돌리기": ["stretch", "warm", "양팔을 크게 앞뒤로 10번씩 돌리기 · 어깨 관절 풀기"],
  "가슴 스트레칭": ["stretch", "warm", "문틀에 팔 대고 몸을 앞으로 기울이기 · 가슴 늘리기"],
  "캣카우 스트레칭": ["catcow", "warm", "네발 자세에서 등을 둥글게 말았다 펴기 · 허리·등 풀기"],
  "밴드 풀어파트": ["spread", "warm", "밴드를 양손으로 잡고 옆으로 벌리기 · 등 위쪽 깨우기"],
  "밴드 외회전": ["spread", "warm", "팔꿈치 몸에 붙이고 밴드를 바깥으로 돌리기 · 어깨 보호"],
  "맨몸 스쿼트": ["squat", "warm", "무게 없이 천천히 15번 앉았다 일어나기 · 무릎·고관절 풀기"],
  "고관절 스트레칭": ["lunge", "warm", "한 발 앞으로 런지 자세로 골반 앞쪽 늘리기"],
  "손목 돌리기": ["stretch", "warm", "손목과 팔꿈치를 천천히 돌리기 · 부상 예방"],
  "데드버그": ["deadbug", "warm", "누워서 반대쪽 팔다리를 번갈아 뻗기 · 코어 깨우기"],
  "벤치 프레스": ["bench", "free", "벤치에 누워 바벨을 가슴까지 내렸다 밀기 · 가슴 전체"],
  "인클라인 벤치 프레스": ["incline", "free", "등받이를 30~45도 세우고 바벨 밀기 · 윗가슴"],
  "덤벨 프레스": ["bench", "free", "누워서 덤벨 두 개를 밀어 올리기 · 가슴"],
  "인클라인 덤벨 프레스": ["incline", "free", "비스듬한 벤치에서 덤벨 밀기 · 윗가슴"],
  "체스트 프레스 머신": ["chest", "machine", "앉아서 손잡이를 앞으로 밀기 · 가슴 (초보 추천)"],
  "원 암 체스트 프레스 머신": ["chest", "machine", "한 팔씩 앞으로 밀기 · 좌우 균형"],
  "펙덱 플라이": ["fly", "machine", "앉아서 팔을 앞으로 끌어안듯 모으기 · 가슴 안쪽"],
  "케이블 플라이": ["fly", "cable", "양쪽 케이블을 앞으로 끌어안듯 모으기 · 가슴 안쪽"],
  "딥스": ["dips", "body", "평행봉에서 몸을 내렸다 밀어 올리기 · 아랫가슴·삼두"],
  "푸시업": ["pushup", "body", "엎드려 팔굽혀펴기 · 가슴·삼두"],
  "바벨 로우": ["bentrow", "free", "상체를 숙이고 바벨을 배꼽 쪽으로 당기기 · 등 두께"],
  "원 암 덤벨 로우": ["bentrow", "free", "벤치에 한 손 짚고 덤벨을 옆구리로 당기기 · 등"],
  "티바 로우": ["bentrow", "free", "숙인 자세로 손잡이를 가슴 쪽으로 당기기 · 등 두께"],
  "데드리프트": ["deadlift", "free", "바닥의 바벨을 허리 편 채 들어 올리기 · 등·엉덩이"],
  "랫 풀다운": ["pulldown", "machine", "앉아서 위의 바를 쇄골 쪽으로 당기기 · 넓은 등"],
  "케이블 암 풀다운": ["straight", "cable", "팔을 편 채 케이블을 허벅지까지 내리기 · 넓은 등"],
  "시티드 케이블 로우 (롱 풀)": ["row", "cable", "앉아서 손잡이를 배 쪽으로 당기기 · 등 가운데"],
  "풀업": ["pullup", "body", "철봉에 매달려 턱까지 당겨 오르기 · 넓은 등"],
  "오버헤드 프레스": ["ohp", "free", "서서 바벨을 머리 위로 밀기 · 어깨 앞·옆"],
  "덤벨 숄더 프레스": ["ohp", "free", "앉아서 덤벨을 머리 위로 밀기 · 어깨"],
  "덤벨 사이드 레터럴 레이즈": ["spread", "free", "덤벨을 옆으로 어깨 높이까지 들기 · 어깨 옆"],
  "프론트 레이즈": ["front", "free", "덤벨을 앞으로 어깨 높이까지 들기 · 어깨 앞"],
  "숄더 프레스 머신": ["ohp", "machine", "앉아서 손잡이를 위로 밀기 · 어깨 (초보 추천)"],
  "리버스 펙 덱 플라이": ["spread", "machine", "기계를 마주 보고 팔을 뒤로 벌리기 · 어깨 뒤"],
  "원 암 케이블 레터럴 레이즈": ["spread", "cable", "케이블을 한 팔씩 옆으로 들기 · 어깨 옆"],
  "페이스풀": ["facepull", "cable", "로프를 얼굴 쪽으로 당기며 팔꿈치 벌리기 · 어깨 뒤"],
  "스쿼트": ["squat", "free", "바벨을 메고 앉았다 일어나기 · 허벅지·엉덩이"],
  "런지": ["lunge", "free", "한 발 앞으로 내딛고 무릎 굽히기 · 허벅지·엉덩이"],
  "루마니안 데드리프트": ["deadlift", "free", "무릎 살짝 굽히고 엉덩이 빼며 숙이기 · 허벅지 뒤"],
  "힙 쓰러스트": ["hipthrust", "free", "등을 벤치에 대고 엉덩이 들어 올리기 · 엉덩이"],
  "레그 프레스": ["legpress", "machine", "기계에 기대 누워 발판을 밀기 · 허벅지 앞"],
  "시티드 레그 프레스": ["seatpress", "machine", "앉아서 발판을 앞으로 밀기 · 허벅지 앞"],
  "핵 스쿼트": ["squat", "machine", "기계에 등을 대고 앉았다 일어나기 · 허벅지 앞"],
  "레그 익스텐션": ["legext", "machine", "앉아서 무릎을 쭉 펴기 · 허벅지 앞"],
  "레그 컬": ["legcurl", "machine", "엎드려 발뒤꿈치를 엉덩이 쪽으로 당기기 · 허벅지 뒤"],
  "카프 레이즈": ["calf", "machine", "발끝으로 서서 뒤꿈치 들기 · 종아리"],
  "바벨 컬": ["curl", "free", "팔꿈치 고정하고 바벨 들어 올리기 · 이두"],
  "덤벨 컬": ["curl", "free", "덤벨을 번갈아 들어 올리기 · 이두"],
  "해머 컬": ["curl", "free", "덤벨을 세로로 잡고 들기 · 이두·팔뚝"],
  "오버헤드 익스텐션": ["ohext", "free", "바나 케이블을 머리 뒤로 내렸다 펴기 · 삼두"],
  "덤벨 오버헤드 익스텐션": ["ohext", "free", "덤벨 하나를 양손으로 잡고 머리 뒤로 내렸다 펴기 · 삼두 긴머리"],
  "라잉 트라이셉스 익스텐션": ["lyingext", "free", "누워서 바를 이마 쪽으로 내렸다 펴기 · 삼두"],
  "케이블 컬": ["curl", "cable", "아래 케이블을 당겨 올리기 · 이두"],
  "트라이셉스 푸시다운": ["pushdown", "cable", "위 케이블을 팔꿈치 고정하고 아래로 밀기 · 삼두"],
  "케이블 크런치": ["crunch", "cable", "무릎 꿇고 케이블을 잡고 상체 말기 · 복근"],
  "크런치": ["crunch", "body", "누워서 등 위쪽만 말아 올리기 · 윗배"],
  "레그 레이즈": ["legraise", "body", "누워서 다리를 곧게 들어 올리기 · 아랫배"],
  "행잉 레그 레이즈": ["hang", "body", "철봉에 매달려 다리 들기 · 아랫배"],
  "러시안 트위스트": ["twist", "body", "앉아서 상체를 좌우로 비틀기 · 옆구리"],
  "플랭크": ["plank", "body", "팔꿈치로 버티며 몸을 일자로 유지 · 코어"],
  "유산소": ["run", "cardio", "자유 유산소 · 시간만 기록"],
  "경사 걷기": ["walk", "cardio", "경사 올려 빠르게 걷기 · 지방 태우기 좋음"],
  "러닝머신": ["run", "cardio", "달리기 · 전신 유산소"],
  "사이클": ["bike", "cardio", "실내 자전거 · 무릎 부담 적음"],
  "스텝밀": ["stairs", "cardio", "계단 오르기 기계 · 하체·엉덩이"],
  "로잉머신": ["rower", "cardio", "노 젓기 · 등까지 쓰는 유산소"],
  "일립티컬": ["run", "cardio", "무릎 부담 적은 걷기 기계"],
};

// 부위별 추천 루틴 (위에서부터 순서대로)
const ROUTINE = {
  "가슴": [["몸풀기", ["팔 돌리기", "가슴 스트레칭"]], ["웨이트", ["벤치 프레스", "인클라인 덤벨 프레스"]], ["머신 · 케이블", ["체스트 프레스 머신", "케이블 플라이"]]],
  "등": [["몸풀기", ["캣카우 스트레칭", "밴드 풀어파트"]], ["웨이트 · 머신", ["랫 풀다운", "바벨 로우"]], ["케이블", ["시티드 케이블 로우 (롱 풀)", "케이블 암 풀다운"]]],
  "어깨": [["몸풀기", ["팔 돌리기", "밴드 외회전"]], ["웨이트", ["덤벨 숄더 프레스", "덤벨 사이드 레터럴 레이즈"]], ["머신 · 케이블", ["리버스 펙 덱 플라이", "페이스풀"]]],
  "하체": [["몸풀기", ["맨몸 스쿼트", "고관절 스트레칭"]], ["웨이트", ["스쿼트", "루마니안 데드리프트"]], ["머신", ["레그 프레스", "레그 익스텐션", "레그 컬"]]],
  "팔": [["몸풀기", ["손목 돌리기"]], ["이두", ["바벨 컬", "해머 컬"]], ["삼두", ["트라이셉스 푸시다운", "오버헤드 익스텐션"]]],
  "복근": [["몸풀기", ["캣카우 스트레칭", "데드버그"]], ["메인", ["크런치", "레그 레이즈", "플랭크"]]],
  "유산소": [["추천", ["경사 걷기", "사이클"]]],
};
// 같이 하면 좋은 부위
const COMBOS = {
  "가슴": { with: ["팔", "어깨"], why: "미는 운동끼리 묶으면 좋아요 · 가슴 + 삼두" },
  "등": { with: ["팔"], why: "당기는 운동끼리 묶으면 좋아요 · 등 + 이두" },
  "어깨": { with: ["복근"], why: "어깨는 가슴 다음 날은 피하고, 복근이랑 같이" },
  "하체": { with: ["복근"], why: "하체는 힘이 많이 들어서 복근 정도만 같이" },
  "팔": { with: ["가슴", "등"], why: "삼두는 가슴 날, 이두는 등 날에 붙이면 좋아요" },
  "복근": { with: ["하체", "어깨"], why: "어느 날이든 마무리로 10분" },
  "유산소": { with: [], why: "웨이트 끝나고 15~20분 하면 지방 태우기에 좋아요" },
};

// 그림 (48×48 칸에 그린 간단한 자세 그림)
const ICONS = {
  bench:{h:[10,27],b:[[14,28,30,28,36,34,36,42],[22,28,22,15]],e:[[8,32,38,32],[12,32,12,42],[33,32,33,42],[12,15,32,15]],w:[[12,11,12,19],[32,11,32,19]]},
  incline:{h:[32,19],b:[[29,23,16,35,10,36,10,42],[27,25,29,10]],e:[[12,40,34,20],[24,31,24,42],[21,10,37,10]],w:[[21,6,21,14],[37,6,37,14]]},
  chest:{h:[17,11],b:[[17,15,17,33,28,33,28,43],[17,21,33,21]],e:[[12,8,12,36,26,36],[19,36,19,44],[33,15,33,27],[40,6,40,44]]},
  fly:{h:[24,9],b:[[24,13,24,29],[24,29,19,43],[24,29,29,43],[24,17,15,22],[24,17,33,22]],e:[[3,4,15,22],[45,4,33,22]]},
  spread:{h:[24,10],b:[[24,14,24,29],[24,29,19,43],[24,29,29,43],[24,18,8,18],[24,18,40,18]],w:[[8,15,8,21],[40,15,40,21]]},
  front:{h:[20,9],b:[[20,13,20,29],[20,29,17,43],[20,29,24,43],[20,17,37,17]],w:[[37,14,37,20]]},
  ohp:{h:[24,14],b:[[24,18,24,31],[24,31,19,44],[24,31,29,44],[24,21,14,18,14,7],[24,21,34,18,34,7]],e:[[9,7,39,7]],w:[[9,3,9,11],[39,3,39,11]]},
  dips:{h:[24,9],b:[[24,13,24,28],[24,28,21,39],[24,28,27,39],[24,15,17,18,17,24],[24,15,31,18,31,24]],e:[[8,24,19,24],[29,24,40,24],[10,24,10,44],[38,24,38,44]]},
  pushup:{h:[9,24],b:[[12,26,40,35],[16,27,16,37]],e:[[4,38,44,38]]},
  pulldown:{h:[24,17],b:[[24,21,24,35],[24,35,17,38,17,44],[24,35,31,38,31,44],[24,23,14,15,12,6],[24,23,34,15,36,6]],e:[[8,6,40,6],[24,2,24,6],[14,39,34,39]]},
  pullup:{h:[24,12],b:[[24,16,24,30],[24,30,22,42],[24,30,26,42],[24,17,16,11,14,6],[24,17,32,11,34,6]],e:[[6,6,42,6]]},
  row:{h:[16,14],b:[[17,18,20,36],[20,36,31,31,38,37],[18,22,12,27,22,28]],e:[[22,28,44,28],[12,38,26,38],[40,30,40,42]]},
  bentrow:{h:[12,14],b:[[15,16,30,26],[30,26,27,35,30,44],[18,18,20,32]],w:[[20,28,20,36]],e:[[4,44,44,44]]},
  deadlift:{h:[13,18],b:[[16,20,30,25],[30,25,25,34,28,44],[19,22,22,37]],w:[[22,33,22,43]],e:[[4,44,44,44]]},
  facepull:{h:[17,10],b:[[17,14,17,30],[17,30,14,43],[17,30,21,43],[17,17,26,14,28,12]],e:[[28,12,44,10]]},
  straight:{h:[17,10],b:[[17,14,19,30],[19,30,15,43],[19,30,23,43],[17,17,31,29]],e:[[38,2,31,29]]},
  pushdown:{h:[18,9],b:[[18,13,19,29],[19,29,16,43],[19,29,22,43],[18,16,20,24,29,30]],e:[[34,2,29,30]]},
  squat:{h:[24,9],b:[[22,13,14,27],[14,27,27,30,23,43],[21,15,16,14]],w:[[15,10,15,18]],e:[[4,44,44,44]]},
  legpress:{h:[9,25],b:[[11,28,18,37],[18,37,27,27,34,25]],e:[[5,30,17,42],[30,16,38,30],[18,42,42,10]]},
  seatpress:{h:[13,13],b:[[13,17,15,35],[15,35,28,27,40,31]],e:[[9,10,9,38,22,38],[40,22,40,40]]},
  lunge:{h:[22,8],b:[[22,12,22,27],[22,27,31,34,31,43],[22,27,15,39,8,42]],e:[[4,44,44,44]]},
  legext:{h:[14,11],b:[[14,15,14,31,27,31,40,28],[14,19,20,27]],e:[[9,8,9,34,26,34],[18,34,18,44]],w:[[40,25,40,32]]},
  legcurl:{h:[8,24],b:[[11,26,34,26,38,13]],e:[[4,30,36,30],[8,30,8,42],[32,30,32,42]],w:[[34,11,41,15]]},
  hipthrust:{h:[8,17],b:[[11,20,26,19,34,25,36,42]],e:[[3,23,14,23],[8,23,8,42]],w:[[26,14,26,22]]},
  calf:{h:[24,7],b:[[24,11,24,27],[24,27,25,37,28,40],[24,14,22,26]],e:[[18,40,34,40,34,44]]},
  curl:{h:[20,8],b:[[20,12,20,28],[20,28,17,43],[20,28,23,43],[20,15,20,24,29,16]],w:[[29,13,29,19]]},
  ohext:{h:[19,13],b:[[20,17,20,32],[20,32,17,44],[20,32,23,44],[20,19,25,5,31,10]],w:[[32,7,32,13]]},
  lyingext:{h:[10,27],b:[[14,28,30,28,36,34,36,42],[22,28,24,17,16,15]],e:[[8,32,38,32],[12,32,12,42],[33,32,33,42]],w:[[15,12,15,18]]},
  crunch:{h:[13,28],b:[[16,30,26,37],[26,37,33,28,40,38],[16,31,20,27]],e:[[4,40,44,40]]},
  legraise:{h:[8,36],b:[[11,37,26,37],[26,37,33,11],[14,37,22,38]],e:[[4,40,44,40]]},
  hang:{h:[22,10],b:[[22,14,22,28],[22,28,40,28],[23,15,26,4]],e:[[10,4,36,4]]},
  plank:{h:[9,26],b:[[12,28,40,37],[14,29,15,40,22,40]],e:[[4,41,44,41]]},
  twist:{h:[16,13],b:[[18,17,24,38],[24,38,32,30,40,32],[20,23,30,27]],w:[[31,24,31,30]],e:[[4,42,44,42]]},
  run:{h:[22,6],b:[[21,10,19,24],[19,24,26,32,23,40],[19,24,13,32,8,30],[21,13,27,18,31,14],[21,13,15,19]],e:[[4,42,40,42,44,30]]},
  walk:{h:[22,7],b:[[22,11,21,25],[21,25,26,33,26,40],[21,25,17,33,14,38],[22,14,26,22],[22,14,18,21]],e:[[4,42,44,34]]},
  bike:{h:[27,9],b:[[24,13,14,22],[14,22,24,28,22,38],[24,14,34,17]],e:[[10,22,18,22],[14,24,28,40,34,26],[34,17,34,26],[31,16,38,16],[20,42,36,42]]},
  stairs:{h:[24,6],b:[[24,10,24,22],[24,22,30,24,31,26],[24,22,21,30,20,32],[24,13,28,19]],e:[[6,44,6,38,16,38,16,32,26,32,26,26,36,26,36,20]]},
  rower:{h:[12,16],b:[[14,20,16,36],[16,36,28,28,38,36],[15,23,24,28]],e:[[4,40,44,40],[38,32,38,40],[12,38,20,38]]},
  stretch:{h:[24,10],b:[[24,14,24,29],[24,29,19,43],[24,29,29,43],[24,17,14,7],[24,17,34,7]]},
  catcow:{h:[8,22],b:[[11,22,24,15,34,22],[13,22,13,36],[34,22,36,36]],e:[[4,37,44,37]]},
  deadbug:{h:[8,36],b:[[11,36,26,36],[26,36,30,26,38,26],[14,36,16,24]],e:[[4,40,44,40]]},
  generic:{h:[24,10],b:[[24,14,24,29],[24,29,19,43],[24,29,29,43],[24,18,16,24],[24,18,32,24]],w:[[14,21,14,27],[34,21,34,27]]},
};
function iconSVG(key){
  const ic = ICONS[key] || ICONS.generic;
  const pts = a => a.reduce((acc, v, i) => acc + (i % 2 ? "," + v : (i ? " " : "") + v), "");
  let s = '<svg viewBox="0 0 48 48" aria-hidden="true">';
  for (const a of ic.e || []) s += `<polyline class="e" points="${pts(a)}"/>`;
  for (const a of ic.b || []) s += `<polyline class="b" points="${pts(a)}"/>`;
  s += `<circle class="b" cx="${ic.h[0]}" cy="${ic.h[1]}" r="3.6"/>`;
  for (const a of ic.w || []) s += `<polyline class="w" points="${pts(a)}"/>`;
  return s + "</svg>";
}
function icoEl(name){ const d = document.createElement("span"); d.className = "ex-ico"; d.innerHTML = iconSVG(EX_INFO[name]?.[0]); return d; }
// 한쪽 무게·횟수로 적는 운동은 양쪽 합으로 볼륨 계산 (짐워크와 같은 방식)
const PER_SIDE = new Set(["원 암 체스트 프레스 머신", "원 암 케이블 레터럴 레이즈", "덤벨 사이드 레터럴 레이즈", "원 암 덤벨 로우"]);
const PARTS = Object.keys(EXERCISES);
const CARDIO_MET = { "팔 돌리기": 3, "가슴 스트레칭": 2.5, "캣카우 스트레칭": 2.5, "밴드 풀어파트": 3, "밴드 외회전": 3, "맨몸 스쿼트": 4, "고관절 스트레칭": 2.5, "손목 돌리기": 2.5, "데드버그": 3, "러닝머신": 9, "경사 걷기": 6, "사이클": 7, "스텝밀": 9, "로잉머신": 7, "일립티컬": 5 };
const STRENGTH_MET = 5, MIN_PER_SET = 2.5;

// 짐워크 앱에서 옮겨온 기록 (한 번만 넣고, 그날 이미 운동 기록이 있으면 건너뜀)
const S = (...a) => a.map(([kg, reps]) => ({ kg, reps }));
const IMPORTS = [];
// Claude가 대신 넣어주는 식단 기록 (한 번만 들어감)
// 식단 기록은 이제 저장소에 직접 넣어요 (페이지에서 다시 넣지 않게 비워둠)
const MEAL_IMPORTS = [];
const MEAL_MOVES = [];
const MEAL_FIXES = [];
let importsDone = false;

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const isDayKey = k => /^\d{4}-\d{2}-\d{2}$/.test(k);
const DAYS = ["일","월","화","수","목","금","토"];
const fmt = n => Math.round(n).toLocaleString();
const one = n => (Math.round(n * 10) / 10).toFixed(1);
const longDate = d => `${d.getMonth()+1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;

let profile = loadProfileLocal() || structuredClone(DEFAULT_PROFILE);
let TARGET = computeTargets(profile);
let current = new Date();
let viewMonth = new Date(current.getFullYear(), current.getMonth(), 1);
let day = emptyDay();
let cache = {};
let db = null, uid = null, sample = null;
let saveTimer = null, saving = false, pending = false, dirty = false;
let profileDirty = false;
let pickPart = "가슴";

function emptyWorkout(){ return { parts: [], minutes: 0, note: "", exercises: [] }; }
function emptyDay(){ return { checks: {}, water: 0, extras: [], workout: emptyWorkout() }; }
// 저장소에서 온 값은 얼어 있어서(수정 불가) 통째로 깊은 복사
function cleanDay(src){
  const d = JSON.parse(JSON.stringify(src || {}));
  d.checks = d.checks || {}; d.extras = d.extras || [];
  for (const [id, on] of Object.entries(d.checks)) if (LEGACY[id] && !(id in PRESET_IDS)) { if (on) d.extras.push({ ...LEGACY[id], pid: id }); delete d.checks[id]; }
  const w = d.workout || {};
  return { checks: { ...(d.checks||{}) }, water: d.water||0, extras: [...(d.extras||[])],
    workout: { parts: [...(w.parts||[])], minutes: w.minutes||0, startedAt: w.startedAt || null, note: w.note||"", summary: w.summary ? { ...w.summary } : undefined, kcal: w.kcal != null ? w.kcal : undefined,
      exercises: (w.exercises||[]).map(e => ({ ...e, sets: e.sets ? e.sets.map(s => ({ ...s })) : undefined })) } };
}
function getMeal(){ return document.querySelector('input[name="meal"]:checked')?.value || "etc"; }
function setMeal(v){ const el = $("m-" + v); if (el) el.checked = true; }

// ---------- 저장 ----------
function localKey(k){ return "meal-note:" + k; }
function loadLocal(k){ try { return JSON.parse(localStorage.getItem(localKey(k))) || null; } catch { return null; } }
function saveLocal(k, v){ try { localStorage.setItem(localKey(k), JSON.stringify(v)); } catch {} }
function loadProfileLocal(){ const p = loadLocal("profile"); return p && p.body ? { ...DEFAULT_PROFILE, ...p } : null; }
function userCol(){ return db && uid ? db.collection("data/users/" + uid) : null; }
function dayData(k){ return k === keyOf(current) ? day : (cache[k] || loadLocal(k)); }

let editVer = 0;   // 고칠 때마다 +1 — 저장이 끝났을 때 그 사이 또 고친 게 있으면 서버 값으로 덮어쓰지 않게
function scheduleSave(){
  editVer++;
  saveLocal(keyOf(current), day);
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 700);
}
async function flush(){
  const col = userCol();
  if (!col) { $("saveStatus").textContent = "이 기기에만 저장돼요"; return; }
  if (saving) { pending = true; return; }
  saving = true;
  const k = keyOf(current), ver = editVer;
  try {
    await col.doc(k).set({ ...day, date: k, totals: totalsOf(day), updatedAt: Date.now() });
    if (editVer === ver && !pending) dirty = false;
    $("saveStatus").textContent = "저장됨";
    $("wSaved").textContent = "저장됨";
  } catch (e) {
    $("saveStatus").textContent = "저장하지 못했어요. 이 기기에는 남아 있어요";
  } finally {
    saving = false;
    if (pending) { pending = false; flush(); }
  }
}
async function saveProfile(){
  saveLocal("profile", profile);
  TARGET = computeTargets(profile);
  render();
  const col = userCol();
  if (!col) return;
  profileDirty = true;
  try { await col.doc("profile").set({ ...profile, updatedAt: Date.now() }); }
  catch (e) { $("saveStatus").textContent = "프로필을 저장하지 못했어요. 이 기기에는 남아 있어요"; }
  finally { profileDirty = false; }
}

function openDay(){
  if (dirty) { clearTimeout(saveTimer); flush(); }
  const k = keyOf(current);
  viewMonth = new Date(current.getFullYear(), current.getMonth(), 1); calWeek = null;
  const src = cache[k] || loadLocal(k);
  day = src ? cleanDay(src) : emptyDay();
  $("feedback").hidden = true; $("aiStatus").textContent = ""; $("wSaved").textContent = "";
  render(true);
}

// ---------- 식단 계산 ----------
const NUTR = ["kcal", "protein", "carb", "fat", "sodium"];
function itemsTotal(list){
  const a = Object.fromEntries(NUTR.map(k => [k, 0]));
  for (const x of list) for (const k of NUTR) a[k] += +x[k] || 0;
  return a;
}
function totalsOf(d){
  const picked = Object.entries(d.checks || {}).filter(([id, on]) => on && (PRESET[id] || LEGACY[id])).map(([id]) => PRESET[id] || LEGACY[id]);
  const t = itemsTotal([...picked, ...(d.extras || [])]);
  const ws = workoutStats(d.workout);
  return { kcal: Math.round(t.kcal), protein: Math.round(t.protein), carb: Math.round(t.carb), fat: Math.round(t.fat), sodium: Math.round(t.sodium), water: d.water || 0, burn: ws.kcal, volume: ws.volume };
}
function summaryOf(k){
  if (k === keyOf(current)) return totalsOf(day);
  if (cache[k]) return cache[k].totals || totalsOf(cache[k]);
  const l = loadLocal(k); return l ? totalsOf(l) : null;
}
// 나트륨 희석: 목표 비율(나트륨 기준 ÷ 물 목표, 예 2,300mg ÷ 2.5L ≈ 920mg/L)과 오늘 비율을 비교
function diluteInfo(t){
  const ratio = TARGET.sodium / (TARGET.water / 1000);
  const need = Math.max(TARGET.water, Math.ceil(t.sodium / ratio * 10) * 100);   // 이 나트륨을 기준 비율로 맞추는 데 필요한 물(ml)
  const perL = t.water ? Math.round(t.sodium / (t.water / 1000)) : null;
  return { ratio: Math.round(ratio), need, perL, left: Math.max(0, need - t.water) };
}
function renderDilute(t){
  const box = $("dilute"); box.hidden = !t.sodium;
  if (!t.sodium) return;
  const d = diluteInfo(t), pctDone = Math.min(100, Math.round(t.water / d.need * 100));
  $("dilNum").innerHTML = d.perL == null ? `물 0L` : `물 1L당 ${fmt(d.perL)}mg<small> · 기준 ${fmt(d.ratio)}</small>`;
  $("dilBar").style.width = pctDone + "%";
  $("dilBar").style.background = d.left ? "var(--teal)" : "var(--accent)";
  $("dilHint").textContent = d.left
    ? `나트륨 ${fmt(t.sodium)}mg이면 물 ${(d.need / 1000).toFixed(1)}L가 기준이에요 · ${(d.left / 1000).toFixed(1)}L 더 마시면 맞춰져요`
    : `나트륨 ${fmt(t.sodium)}mg 기준 물 ${(d.need / 1000).toFixed(1)}L 다 채웠어요 · 희석 완료`;
}
function hintText(t){
  if (t.kcal === 0 && t.water === 0) return "먹은 걸 체크해 보세요";
  const left = TARGET.protein - t.protein;
  if (t.kcal > TARGET.kcal + 150) return `목표보다 ${fmt(t.kcal - TARGET.kcal)}kcal 더 먹었어요`;
  if (t.sodium > TARGET.sodium) { const d = diluteInfo(t); return d.left ? `나트륨 ${fmt(t.sodium - TARGET.sodium)}mg 넘었어요 · 물 ${(d.left / 1000).toFixed(1)}L 더 마셔요` : `나트륨은 넘었지만 물로 충분히 희석했어요`; }
  if (left > 0) return `단백질 ${left}g 더 먹으면 돼요`;
  if (t.water < TARGET.water) return `물 ${fmt(TARGET.water - t.water)}ml만 더 마셔요`;
  return "오늘 목표 다 채웠어요";
}
const pct = (v, m) => Math.min(100, Math.round(v / m * 100)) + "%";

// ---------- 운동 계산 ----------
const isCardio = e => e.part === "유산소" || (EX_INFO[e.name] && EX_INFO[e.name][1] === "warm");
function workoutStats(w){
  w = w || {};
  let volume = 0, sets = 0, cardioMin = 0, cardioKcal = 0;
  const bw = TARGET.weight || 70;
  for (const e of w.exercises || []) {
    if (isCardio(e)) { const m = +e.minutes || 0; cardioMin += m; cardioKcal += (CARDIO_MET[e.name] || 6) * bw * m / 60; }
    else { const k = PER_SIDE.has(e.name) ? 2 : 1; for (const s of e.sets || []) { const r = +s.reps || 0; if (r > 0 && s.done !== false) { sets++; volume += (+s.kg || 0) * r * k; } } }
    if (isCardio(e) && +e.minutes > 0) sets++;
  }
  const liveMin = (w.minutes || 0) + (w.startedAt ? Math.max(0, (Date.now() - w.startedAt) / 60000) : 0);
  const strengthMin = liveMin ? Math.max(0, liveMin - cardioMin) : sets * MIN_PER_SET;
  const kcal = w.kcal != null ? w.kcal : STRENGTH_MET * bw * strengthMin / 60 + cardioKcal;
  // 옮겨온 기록처럼 세트 없이 총량만 있는 날
  if (!volume && w.summary && w.summary.volume) volume = w.summary.volume;
  return { volume: Math.round(volume), sets: sets || (w.summary ? null : 0), minutes: Math.round(strengthMin + cardioMin), kcal: Math.round(kcal) };
}
function partsOf(w){
  if (!w) return [];
  const ex = w.exercises || [];
  if (!ex.length) return w.summary ? PARTS.filter(p => (w.parts || []).includes(p)) : [];
  const s = new Set(ex.map(e => e.part).filter(Boolean));
  return PARTS.filter(p => s.has(p));
}

// ---------- 탭 ----------
const TABS = ["home", "meal", "workout"];
function showTab(name){
  if (!TABS.includes(name)) name = "home";
  for (const t of TABS) $("view-" + t).hidden = t !== name;
  document.querySelectorAll(".tab").forEach(b => { if (b.dataset.tab === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  if (location.hash.slice(1) !== name && !isAuthHash()) { try { history.replaceState(null, "", "#" + name); } catch { location.hash = name; } }
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tab").forEach(b => b.onclick = () => showTab(b.dataset.tab));
document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { if (keyOf(current) !== keyOf(new Date())) { current = new Date(); openDay(); } showTab(b.dataset.go); });
// 카카오 로그인에서 돌아오면 주소 뒤에 #access_token=… 이 붙어 와요. Supabase가 읽기 전에 지우면 안 돼요
function isAuthHash(){ return /(^#|&)(access_token|refresh_token|error|error_description)=/.test(location.hash); }
window.addEventListener("hashchange", () => { if (!isAuthHash()) showTab(location.hash.slice(1)); });

// ---------- 홈 ----------
function renderHome(){
  const now = new Date(), todayK = keyOf(now);
  $("homeDate").textContent = longDate(now);
  $("hello").textContent = profile.nickname ? `${profile.nickname}님, 오늘도 가볼까요` : "오늘도 가볼까요";
  const t = summaryOf(todayK) || { kcal: 0, protein: 0, water: 0, sodium: 0 };
  $("hKcal").textContent = fmt(t.kcal);
  $("hHint").textContent = t.kcal ? `목표 ${fmt(TARGET.kcal)}kcal 중 ${fmt(Math.max(0, TARGET.kcal - t.kcal))}kcal 남았어요` : "아직 기록이 없어요";
  $("hPro").innerHTML = `${t.protein}<small> / ${TARGET.protein}g</small>`;
  $("hWater").innerHTML = `${(t.water/1000).toFixed(1)}<small> / ${TARGET.water/1000}L</small>`;
  $("hProBar").style.width = pct(t.protein, TARGET.protein);
  $("hWaterBar").style.width = pct(t.water, TARGET.water);
  const ws = workoutStats(dayData(todayK)?.workout);
  $("hWork").innerHTML = `${fmt(ws.kcal)}<small> / ${fmt(TARGET.burn)}kcal</small>`;
  $("hWorkBar").style.width = pct(ws.kcal, TARGET.burn);
  $("hWorkSub").textContent = `이번 주 ${weekWorkoutCount(now)}회`;

  const list = (profile.body || []).slice().sort((a, c) => a.date.localeCompare(c.date));
  const last = list[list.length - 1];
  const delta = (k, unit) => {
    if (!last || last[k] == null) return "";
    const p = list.slice(0, -1).reverse().find(x => x[k] != null);
    if (!p) return "";
    const d = last[k] - p[k]; return `${d >= 0 ? "+" : ""}${one(d)}${unit}`;
  };
  $("bodyDate").textContent = last ? shortDate(last.date) : "";
  $("bW").innerHTML = last ? `${one(last.weight)}<small>kg</small>` : "-";
  $("bS").innerHTML = last && last.smm != null ? `${one(last.smm)}<small>kg</small>` : "-";
  $("bF").innerHTML = last && last.bf != null ? `${one(last.bf)}<small>%</small>` : "-";
  $("bWd").textContent = delta("weight", "kg"); $("bSd").textContent = delta("smm", "kg"); $("bFd").textContent = delta("bf", "%p");
  $("chartBox").innerHTML = list.length ? bodyChart(list.slice(-6)) : "";
  if (!$("bDate").value) $("bDate").value = todayK;

  const T = TARGET;
  $("goalLabel").textContent = `${GOALS[profile.goal] || "감량"} 기준`;
  $("targetSum").textContent = `${fmt(T.kcal)}kcal · 단백질 ${T.protein}g · 물 ${(T.water/1000).toFixed(1)}L`;
  const rows = [["칼로리", `${fmt(T.kcal)} kcal`], ["단백질", `${T.protein} g`], ["탄수화물", `${T.carb} g`], ["지방", `${T.fat} g`], ["물", `${(T.water/1000).toFixed(1)} L`], ["나트륨", `${fmt(T.sodium)} mg 이하`], ["운동 소모", `${fmt(T.burn)} kcal`]];
  $("targetRows").innerHTML = "";
  for (const [a, b] of rows) { const r = document.createElement("div"); r.className = "row"; const s = document.createElement("span"); s.textContent = a; const v = document.createElement("b"); v.textContent = b; r.append(s, v); $("targetRows").appendChild(r); }
  const adjTxt = T.adj ? ` ${T.adj > 0 ? "+" : "−"} ${Math.abs(T.adj)}` : "";
  $("targetNote").textContent = `기초대사량 ${fmt(T.bmr)}kcal × 활동량 ${ACTIVITY}${adjTxt} · 단백질은 체중 ${one(T.weight)}kg × ${profile.goal === "bulk" ? 1.8 : 1.6}g · 물은 체중 × 33ml` + (T.usedBf ? " · 기초대사량은 인바디 체지방률로 계산" : "");

  if (document.activeElement !== $("pHeight")) $("pHeight").value = profile.height || "";
  if (document.activeElement !== $("pAge")) $("pAge").value = profile.age || "";
  $("pSex").value = profile.sex || "m";
  if (document.activeElement !== $("pBurn")) $("pBurn").value = profile.burn || "";
  const g = $("g-" + (profile.goal || "cut")); if (g) g.checked = true;
}
function shortDate(k){ return `${k.slice(2,4)}.${k.slice(5,7)}.${k.slice(8,10)}`; }

function bodyChart(list){
  const rows = [
    { k: "weight", t: "체중 kg", c: "var(--accent)" },
    { k: "smm", t: "골격근량 kg", c: "var(--blue)" },
    { k: "bf", t: "체지방률 %", c: "var(--teal)" },
  ];
  const W = 340, rowH = 84, n = list.length;
  const x = i => n === 1 ? W / 2 : 30 + i * ((W - 60) / (n - 1));
  let s = `<svg class="chart" viewBox="0 0 ${W} ${rows.length * rowH + 18}" role="img" aria-label="체중, 골격근량, 체지방률 변화 그래프">`;
  rows.forEach((r, ri) => {
    const y0 = ri * rowH;
    const pts = list.map((e, i) => ({ i, v: e[r.k] })).filter(p => p.v != null);
    if (ri) s += `<line class="ch-grid" x1="0" x2="${W}" y1="${y0 + 1}" y2="${y0 + 1}"/>`;
    s += `<text class="ch-title" x="0" y="${y0 + 15}">${r.t}</text>`;
    if (!pts.length) return;
    const vs = pts.map(p => p.v); let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
    const y = v => y0 + 70 - (v - lo) / (hi - lo) * 36;
    s += `<polyline fill="none" stroke="${r.c}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(p => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}"/>`;
    pts.forEach((p, j) => {
      const last = j === pts.length - 1;
      s += `<circle cx="${x(p.i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${last ? 4.5 : 3}" fill="${last ? r.c : "var(--card)"}" stroke="${r.c}" stroke-width="2"/>`;
      s += `<text class="ch-val${last ? " last" : ""}" x="${x(p.i).toFixed(1)}" y="${(y(p.v) - 9).toFixed(1)}" text-anchor="middle">${one(p.v)}</text>`;
    });
  });
  const yd = rows.length * rowH + 12;
  list.forEach((e, i) => { s += `<text class="ch-date" x="${x(i).toFixed(1)}" y="${yd}" text-anchor="middle">${shortDate(e.date)}</text>`; });
  return s + "</svg>";
}

$("bAdd").onclick = () => {
  const date = $("bDate").value, w = +$("bWeight").value, smm = $("bSmm").value, bf = $("bBf").value;
  if (!date || !(w >= 30 && w <= 250)) { $("bStatus").textContent = "날짜와 체중을 확인해 주세요"; return; }
  const entry = { date, weight: Math.round(w * 10) / 10 };
  if (smm !== "") entry.smm = Math.round(+smm * 10) / 10;
  if (bf !== "") entry.bf = Math.round(+bf * 10) / 10;
  profile.body = (profile.body || []).filter(e => e.date !== date).concat(entry).sort((a, c) => a.date.localeCompare(c.date));
  $("bWeight").value = $("bSmm").value = $("bBf").value = "";
  $("bStatus").textContent = `${shortDate(date)} 기록했어요 · 하루 목표도 새로 맞췄어요`;
  saveProfile();
};
$("bPhoto").onchange = async () => {
  const f = $("bPhoto").files[0]; $("bPhoto").value = ""; if (!f) return;
  const st = $("bStatus");
  if (!sample) { st.textContent = aiOffMsg() + " · 아래 칸에 직접 적어주세요"; return; }
  if (aiBusy) return; aiBusy = true; st.textContent = "인바디 결과지를 읽는 중이에요…";
  try {
    const r = await sample.json(`이 사진은 인바디(InBody) 같은 체성분 검사 결과지야. 아래 값을 읽어서 JSON 하나만 답해줘. 다른 말은 쓰지 마.
{"date":"YYYY-MM-DD 또는 null (측정 날짜·일시)","weight":체중 kg 숫자 또는 null,"smm":골격근량 kg 숫자 또는 null,"bf":체지방률 % 숫자 또는 null,"ok":결과지가 맞고 숫자를 읽었으면 true}
- 체지방률은 '체지방률'(PBF, %) 값이야. 체지방량(kg)과 헷갈리지 마.
- 골격근량은 '골격근량'(SMM, kg) 값이야. 근육량·제지방량과 헷갈리지 마.
- 표준 범위나 그래프 눈금이 아니라 '측정값'을 읽어.
- 안 보이거나 확실하지 않은 값은 null.`, { images: [f] });
    const num = (v, lo, hi) => { const n = +v; return v != null && n >= lo && n <= hi ? Math.round(n * 10) / 10 : null; };
    const w = num(r.weight, 30, 250), smm = num(r.smm, 10, 80), bf = num(r.bf, 3, 70);
    if (!r.ok || w == null) { st.textContent = "결과지에서 체중을 찾지 못했어요. 숫자가 잘 보이게 다시 찍거나 직접 적어주세요"; return; }
    $("bWeight").value = w; $("bSmm").value = smm ?? ""; $("bBf").value = bf ?? "";
    if (typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date <= keyOf(new Date())) $("bDate").value = r.date;
    const got = ["체중", smm != null && "골격근량", bf != null && "체지방률"].filter(Boolean).join("·");
    st.textContent = `사진에서 ${got}을 읽었어요 · 숫자가 맞는지 확인하고 기록하기를 눌러주세요`;
  } catch (e) { st.textContent = aiErrMsg(e, "결과지를 읽지 못했어요. 잠시 후 다시 해보세요"); }
  finally { aiBusy = false; }
};
$("pSave").onclick = () => {
  const h = +$("pHeight").value, a = +$("pAge").value, nn = $("pName").value.trim();
  if (!nn || nn.length > 12) { $("pStatus").textContent = "닉네임을 12자 이내로 적어주세요"; return; }
  if (!(h >= 120 && h <= 230) || !(a >= 10 && a <= 100)) { $("pStatus").textContent = "키와 나이를 확인해 주세요"; return; }
  profile.nickname = nn;
  profile.height = h; profile.age = a; profile.sex = $("pSex").value;
  profile.goal = document.querySelector('input[name="goal"]:checked')?.value || "cut";
  const burn = Math.round(+$("pBurn").value || 0);
  if (burn) profile.burn = Math.min(2000, Math.max(50, burn)); else delete profile.burn;
  $("pStatus").textContent = "저장했어요";
  saveProfile();
};

// ---------- 식단 ----------
let calMonth = false, calWeek = null;   // 기본은 한 주만 보기
function renderCal(){
  const todayK = keyOf(new Date()), selK = keyOf(current);
  const grid = $("calGrid"); grid.innerHTML = "";
  $("calToggle").textContent = calMonth ? "한 주만 보기" : "한 달 보기";
  $("calToggle").setAttribute("aria-expanded", calMonth);
  $("prevM").setAttribute("aria-label", calMonth ? "이전 달" : "지난주");
  $("nextM").setAttribute("aria-label", calMonth ? "다음 달" : "다음 주");
  let days;
  if (calMonth) {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    $("monthLabel").textContent = `${y}. ${pad(m+1)}`;
    const first = new Date(y, m, 1).getDay(), n = new Date(y, m+1, 0).getDate();
    for (let i = 0; i < first; i++) grid.appendChild(document.createElement("span"));
    days = Array.from({ length: n }, (_, i) => new Date(y, m, i + 1));
  } else {
    const ws = calWeek || weekStart(current);
    const we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6);
    $("monthLabel").textContent = `${ws.getMonth()+1}.${ws.getDate()} – ${we.getMonth()+1}.${we.getDate()}`;
    days = Array.from({ length: 7 }, (_, i) => new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + i));
  }
  for (const dt of days) {
    const y = dt.getFullYear(), m = dt.getMonth(), d = dt.getDate();
    const k = keyOf(dt);
    const rec = summaryOf(k);
    const b = document.createElement("button");
    b.className = "day" + (k === selK ? " sel" : "") + (k === todayK ? " today" : "");
    const num = document.createElement("span"); num.className = "d"; num.textContent = d;
    const dot = document.createElement("i"); dot.className = "dot";
    const has = rec && (rec.kcal > 0 || rec.water > 0);
    if (has) dot.className += rec.protein >= TARGET.protein * 0.9 ? " good" : " part";
    b.append(num, dot);
    b.setAttribute("aria-label", `${m+1}월 ${d}일` + (has ? `, ${rec.kcal}kcal 기록` : ""));
    b.onclick = () => { current = new Date(y, m, d); openDay(); };
    grid.appendChild(b);
  }
}
function shiftCal(dir){
  if (calMonth) viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + dir, 1);
  else { const ws = calWeek || weekStart(current); calWeek = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + dir * 7); }
  renderCal();
}
$("prevM").onclick = () => shiftCal(-1);
$("nextM").onclick = () => shiftCal(1);
$("calToggle").onclick = () => { calMonth = !calMonth; calWeek = null; viewMonth = new Date(current.getFullYear(), current.getMonth(), 1); renderCal(); };

function renderMeal(){
  const t = totalsOf(day);
  const isToday = keyOf(current) === keyOf(new Date());
  $("mealDate").textContent = longDate(current);
  $("dayTitle").textContent = isToday ? "오늘 먹은 칼로리" : `${current.getMonth()+1}월 ${current.getDate()}일에 먹은 칼로리`;
  $("kcalBig").textContent = fmt(t.kcal);
  $("hint").textContent = hintText(t);
  $("kcalNum").innerHTML = `${fmt(t.kcal)}<small> / ${fmt(TARGET.kcal)}</small>`;
  $("proNum").innerHTML = `${t.protein}<small> / ${TARGET.protein}g</small>`;
  $("waterNum").innerHTML = `${(t.water/1000).toFixed(1)}<small> / ${TARGET.water/1000}L</small>`;
  $("carbNum").innerHTML = `${t.carb}<small> / ${TARGET.carb}g</small>`;
  $("fatNum").innerHTML = `${t.fat}<small> / ${TARGET.fat}g</small>`;
  $("naNum").innerHTML = `${fmt(t.sodium)}<small> / ${fmt(TARGET.sodium)}</small>`;
  $("kcalBar").style.width = pct(t.kcal, TARGET.kcal);
  $("proBar").style.width = pct(t.protein, TARGET.protein);
  $("waterBar").style.width = pct(t.water, TARGET.water);
  $("carbBar").style.width = pct(t.carb, TARGET.carb);
  $("fatBar").style.width = pct(t.fat, TARGET.fat);
  $("naBar").style.width = pct(t.sodium, TARGET.sodium);
  $("naBar").style.background = t.sodium > TARGET.sodium ? "var(--red)" : "var(--gray)";

  const meals = $("meals"); meals.innerHTML = "";
  for (const m of MEALS) {
    const card = document.createElement("div"); card.className = "card meal-card"; card.dataset.meal = m.key;
    const extras = day.extras.map((x, i) => [x, i]).filter(([x]) => x.meal === m.key || (m.key === "etc" && !MEALS.some(mm => mm.key === x.meal)));
    const picked = m.items.filter(it => day.checks[it.id]);
    const sub = itemsTotal([...picked, ...extras.map(([x]) => x)]);
    const head = document.createElement("div"); head.className = "card-head";
    const h = document.createElement("h2"); h.className = "card-title"; h.textContent = m.title;
    const aside = document.createElement("span"); aside.className = "card-aside num"; aside.textContent = sub.kcal ? `${fmt(sub.kcal)} kcal` : "";
    head.append(h, aside);
    if (m.tip) { head.style.marginBottom = "4px"; }
    const tp = document.createElement("p"); tp.className = "empty"; tp.style.cssText = "font-size:.82rem;margin:0 0 10px";
    if (m.tip) tp.textContent = m.tip;
    const acts = document.createElement("div"); acts.className = "meal-actions";
    const b1 = document.createElement("button"); b1.className = "btn soft"; b1.textContent = "먹은 거 기록하기"; b1.onclick = () => openPickSheet(m.key);
    const b2 = document.createElement("button"); b2.className = "btn"; b2.textContent = "직접 입력하기"; b2.onclick = () => openInputSheet(m.key);
    const b3 = document.createElement("label"); b3.className = "photo-cta"; b3.htmlFor = "ph-" + m.key;
    b3.innerHTML = '<span class="ph-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span><span><b>사진으로 기록</b><small>사진을 첨부하면 해당 식품에 맞춰 더 정확한 영양정보를 알려드려요</small></span>';
    const pf = document.createElement("input"); pf.type = "file"; pf.accept = "image/*"; pf.id = "ph-" + m.key; pf.className = "vh";
    pf.onchange = () => { const f = pf.files[0]; pf.value = ""; if (f) openPhotoSheet(m.key, f); };
    b3.appendChild(pf);
    acts.append(b1, b2, b3);
    const list = document.createElement("div"); list.className = "items";
    for (const it of picked) list.appendChild(presetRow(it));
    extras.forEach(([x, i]) => list.appendChild(extraRow(x, i)));
    if (!list.children.length) { const e = document.createElement("p"); e.className = "eaten-empty"; e.textContent = "아직 기록이 없어요"; list.appendChild(e); }
    card.append(head); if (m.tip) card.append(tp); card.append(acts, list); meals.appendChild(card);
  }

  $("waterAside").textContent = `${fmt(t.water)} ml`;
  renderDilute(t);
  const cups = $("cups"); cups.innerHTML = "";
  const n = Math.max(Math.ceil(TARGET.water / 500), Math.ceil(t.water / 500));
  for (let i = 0; i < n; i++) { const c = document.createElement("div"); c.className = "cup" + (i < t.water / 500 ? " on" : ""); cups.appendChild(c); }

  renderCal();
}
function presetToExtra(it, meal){ return { name: it.name, sub: it.sub || "", kcal: it.kcal, protein: it.protein, carb: it.carb, fat: it.fat, sodium: it.sodium, meal, pid: it.id }; }
function countIn(meal, it){
  let n = 0;
  if (day.checks[it.id] && MEALS.find(m => m.key === meal)?.items.some(x => x.id === it.id)) n++;
  for (const x of day.extras) if (x.meal === meal && (x.pid === it.id || (!x.pid && x.name === it.name && !x.ai))) n++;
  return n;
}
function removeOne(meal, it){
  for (let i = day.extras.length - 1; i >= 0; i--) { const x = day.extras[i]; if (x.meal === meal && (x.pid === it.id || (!x.pid && x.name === it.name && !x.ai))) { day.extras.splice(i, 1); return; } }
  if (day.checks[it.id]) day.checks[it.id] = false;
}
function makeSheet(title){
  document.querySelectorAll(".sheet-bg").forEach(n => n.remove());
  const bg = document.createElement("div"); bg.className = "sheet-bg";
  const sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-label", title);
  const h = document.createElement("h3"); h.textContent = title; sh.appendChild(h);
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.appendChild(sh); document.body.appendChild(bg);
  return { bg, sh, close: () => bg.remove() };
}
function openPickSheet(meal){
  const { sh, close } = makeSheet(`${mealTitle(meal)}에 먹은 거`);
  const own = MEALS.find(m => m.key === meal)?.items || [];
  const others = Object.values(PRESET).filter(it => !own.includes(it));
  const draw = () => {
    sh.querySelectorAll(".pick, .sub-h, .btn.done").forEach(n => n.remove());
    const group = (label, list) => {
      if (!list.length) return;
      const g = document.createElement("p"); g.className = "sub-h"; g.textContent = label; sh.appendChild(g);
      for (const it of list) {
        const n = countIn(meal, it);
        const row = document.createElement("div"); row.className = "pick";
        const t = document.createElement("div"); t.className = "t"; t.textContent = it.name;
        const sm = document.createElement("small"); sm.textContent = `${it.kcal}kcal · 단백질 ${it.protein}g${it.sub ? " · " + it.sub : ""}`; t.appendChild(sm);
        const st = document.createElement("div"); st.className = "stepper";
        if (n) {
          const minus = document.createElement("button"); minus.textContent = "−"; minus.setAttribute("aria-label", it.name + " 하나 빼기");
          minus.onclick = () => { removeOne(meal, it); render(); scheduleSave(); draw(); };
          const c = document.createElement("b"); c.textContent = n;
          st.append(minus, c);
        }
        const plus = document.createElement("button"); plus.className = "add"; plus.textContent = "+"; plus.setAttribute("aria-label", it.name + " 추가");
        plus.onclick = () => { day.extras.push(presetToExtra(it, meal)); render(); scheduleSave(); draw(); };
        st.append(plus);
        row.append(t, st); sh.appendChild(row);
      }
    };
    group("이 끼니 기본 식단", own);
    group("다른 음식", others);
    const done = document.createElement("button"); done.className = "btn primary done"; done.style.marginTop = "10px"; done.textContent = "완료"; done.onclick = close;
    sh.appendChild(done);
  };
  draw();
}
let aiBusy = false;
async function photoRecord(meal, file){
  if (!sample) { toast(aiOffMsg()); return; }
  if (aiBusy) return; aiBusy = true;
  toast("사진 속 음식을 분석하는 중이에요…");
  try {
    const x = await aiEstimate("", file, meal);
    day.extras.push(x); render(); scheduleSave();
    toast(`${x.name} 기록했어요 · ${fmt(x.kcal)}kcal, 단백질 ${x.protein}g`);
  } catch (e) { toast(aiErrMsg(e, "분석하지 못했어요. 잠시 후 다시 해보세요")); }
  finally { aiBusy = false; }
}
// 사진 고른 뒤: 미리보기 + 덧붙일 말 → 계산
function openPhotoSheet(meal, firstFile){
  const { sh, close } = makeSheet(`${mealTitle(meal)}에 먹은 거 사진으로 기록`);
  let photo = firstFile, url = "";
  const prev = document.createElement("div"); prev.className = "ph-prev";
  const img = document.createElement("img"); img.alt = "고른 사진";
  const swap = document.createElement("label"); swap.className = "ph-swap"; swap.textContent = "사진 바꾸기";
  const file = document.createElement("input"); file.type = "file"; file.accept = "image/*"; file.className = "vh"; swap.appendChild(file);
  prev.append(img, swap);
  const show = f => { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(f); img.src = url; };
  show(photo);
  file.onchange = () => { const f = file.files[0]; file.value = ""; if (f) { photo = f; show(f); } };
  const ta = document.createElement("textarea"); ta.placeholder = "덧붙일 말 (선택)\n예: 밥은 반 공기만 먹었어요 · 드레싱은 안 뿌렸어요 · 둘이서 나눠 먹었어요"; ta.setAttribute("aria-label", "덧붙일 말");
  const st = document.createElement("p"); st.className = "status"; st.setAttribute("aria-live", "polite");
  st.textContent = sample ? "양이나 빠진 재료를 적어주면 더 정확해져요 · 포장지 영양성분표를 찍으면 그 숫자 그대로 넣어요" : aiOffMsg();
  const go = document.createElement("button"); go.className = "btn primary"; go.textContent = "칼로리 계산해서 기록";
  const cancel = document.createElement("button"); cancel.className = "btn"; cancel.textContent = "닫기";
  const done = () => { if (url) URL.revokeObjectURL(url); close(); };
  cancel.onclick = done;
  go.onclick = async () => {
    if (!sample) { st.textContent = aiOffMsg(); return; }
    if (aiBusy) return; aiBusy = true; go.disabled = true; st.textContent = "사진 속 음식을 분석하는 중이에요…";
    try {
      const x = await aiEstimate(ta.value.trim(), photo, meal);
      day.extras.push(x); render(); scheduleSave(); done();
      toast(`${x.name} 기록했어요 · ${fmt(x.kcal)}kcal, 단백질 ${x.protein}g`);
    } catch (e) { st.textContent = aiErrMsg(e, "분석하지 못했어요. 잠시 후 다시 해보세요"); }
    finally { aiBusy = false; go.disabled = false; }
  };
  sh.append(prev, ta, st, go, cancel);
}
function openInputSheet(meal){
  const { sh, close } = makeSheet(`${mealTitle(meal)}에 먹은 거 직접 입력`);
  const ta = document.createElement("textarea"); ta.id = "foodText"; ta.placeholder = "뭘 먹었는지 적어주세요\n예: 제육볶음 백반, 밥 2/3 공기"; ta.setAttribute("aria-label", "먹은 음식");
  const fileLb = document.createElement("label"); fileLb.className = "btn small photo"; fileLb.style.cssText = "display:grid;place-items:center"; fileLb.textContent = "사진 첨부";
  const file = document.createElement("input"); file.type = "file"; file.accept = "image/*"; fileLb.appendChild(file);
  const go = document.createElement("button"); go.className = "btn primary"; go.textContent = "칼로리 계산해서 기록";
  const row = document.createElement("div"); row.className = "btns"; row.append(fileLb, go);
  const st = document.createElement("p"); st.className = "status"; st.setAttribute("aria-live", "polite");
  st.textContent = sample ? "사진을 첨부하면 해당 식품에 맞춰 더 정확한 영양정보를 알려드려요 · 포장지 영양성분표를 찍으면 그 숫자 그대로 넣어요" : aiOffMsg() + " · 아래에서 숫자로 직접 넣을 수 있어요";
  let photo = null;
  file.onchange = () => { photo = file.files[0] || null; st.textContent = photo ? "사진을 골랐어요" : ""; };
  go.onclick = async () => {
    const text = ta.value.trim();
    if (!sample) { st.textContent = aiOffMsg(); return; }
    if (!text && !photo) { st.textContent = "먹은 걸 적거나 사진을 골라주세요"; return; }
    if (aiBusy) return; aiBusy = true; go.disabled = true; st.textContent = "계산하는 중이에요…";
    try {
      const x = await aiEstimate(text, photo, meal);
      day.extras.push(x); render(); scheduleSave(); close();
      toast(`${x.name} 기록했어요 · ${fmt(x.kcal)}kcal, 단백질 ${x.protein}g`);
    } catch (e) {
      st.textContent = aiErrMsg(e, "계산하지 못했어요. 잠시 후 다시 해보세요");
    } finally { aiBusy = false; go.disabled = false; }
  };
  const det = document.createElement("details"); det.className = "manual";
  det.innerHTML = `<summary>칼로리를 알면 숫자로 입력</summary><div class="field">
    <input class="full" id="mName" placeholder="음식 이름" aria-label="음식 이름">
    <input id="mKcal" type="number" inputmode="numeric" placeholder="kcal" aria-label="칼로리">
    <input id="mPro" type="number" inputmode="decimal" placeholder="단백질 g" aria-label="단백질">
    <input id="mCarb" type="number" inputmode="decimal" placeholder="탄수화물 g" aria-label="탄수화물">
    <input id="mFat" type="number" inputmode="decimal" placeholder="지방 g" aria-label="지방">
    <input class="full" id="mNa" type="number" inputmode="numeric" placeholder="나트륨 mg (선택)" aria-label="나트륨">
    <button class="btn soft" id="mAdd">기록하기</button></div>`;
  const cancel = document.createElement("button"); cancel.className = "btn"; cancel.textContent = "닫기"; cancel.onclick = close;
  sh.append(ta, row, st, det, cancel);
  det.querySelector("#mAdd").onclick = () => {
    const v = id => det.querySelector("#" + id).value, n1 = id => Math.round((+v(id) || 0) * 10) / 10;
    const name = v("mName").trim(), kcal = Math.round(+v("mKcal") || 0);
    if (!name || !kcal) { st.textContent = "음식 이름과 칼로리를 적어주세요"; return; }
    day.extras.push({ name, kcal, protein: n1("mPro"), carb: n1("mCarb"), fat: n1("mFat"), sodium: Math.round(+v("mNa") || 0), meal });
    render(); scheduleSave(); close(); toast(`${name} 기록했어요`);
  };
  setTimeout(() => ta.focus(), 60);
}
function metaEl(x){
  const meta = document.createElement("div"); meta.className = "meta";
  const b = document.createElement("b"); b.textContent = `${fmt(x.kcal)} kcal`;
  const s = document.createElement("span");
  s.textContent = x.carb != null || x.fat != null ? `탄 ${Math.round(+x.carb||0)} · 단 ${Math.round(+x.protein||0)} · 지 ${Math.round(+x.fat||0)}` : `단백질 ${x.protein}g`;
  meta.append(b, s); return meta;
}
function presetRow(it){
  const row = document.createElement("div"); row.className = "item";
  const wrap = document.createElement("div"); wrap.className = "lbwrap";
  const lb = document.createElement("label"); lb.textContent = it.name;
  if (it.sub) { const s = document.createElement("span"); s.className = "sub"; s.textContent = it.sub; lb.appendChild(s); }
  wrap.append(lb);
  const del = document.createElement("button"); del.className = "del"; del.setAttribute("aria-label", it.name + " 빼기"); del.textContent = "×";
  del.onclick = () => { day.checks[it.id] = false; render(); scheduleSave(); };
  row.append(wrap, metaEl(it), del);
  row.dataset.kind = "preset"; row.dataset.id = it.id; row.classList.add("draggable");
  return row;
}
function extraRow(x, i){
  const row = document.createElement("div"); row.className = "item";
  const wrap = document.createElement("div"); wrap.className = "lbwrap";
  const lb = document.createElement("label"); lb.textContent = x.name;
  if (x.ai) { const tag = document.createElement("span"); tag.className = "ai-tag"; tag.textContent = "AI"; lb.appendChild(tag); }
  const note = x.note || x.sub;
  if (note) { const s = document.createElement("span"); s.className = "sub"; s.textContent = note; lb.appendChild(s); }
  const del = document.createElement("button"); del.className = "del"; del.setAttribute("aria-label", x.name + " 삭제"); del.textContent = "×";
  del.onclick = () => { day.extras.splice(i, 1); render(); scheduleSave(); };
  wrap.append(lb);
  row.append(wrap, metaEl(x), del);
  row.dataset.kind = "extra"; row.dataset.idx = i; row.classList.add("draggable");
  return row;
}
// ---------- 꾹 눌러서 끼니 옮기기 ----------
let press = null, drag = null, swallowClick = false;
function itemFromRow(row){
  if (row.dataset.kind === "extra") return { kind: "extra", idx: +row.dataset.idx, from: day.extras[+row.dataset.idx]?.meal };
  const id = row.dataset.id; const m = MEALS.find(mm => mm.items.some(it => it.id === id));
  return { kind: "preset", id, from: m?.key };
}
function endPress(){ if (press) { clearTimeout(press.timer); press = null; } window.removeEventListener("pointermove", onDragMove); window.removeEventListener("pointerup", onDragUp); window.removeEventListener("pointercancel", onDragUp); }
// 마우스는 pointer 이벤트, 터치(아이폰)는 touch 이벤트로 처리 — iOS에서 pointer는 중간에 취소되는 일이 있어서
$("meals").addEventListener("pointerdown", e => {
  if (e.pointerType !== "mouse") return;
  const row = e.target.closest(".item.draggable");
  if (!row || e.button !== 0 || e.target.closest("button, select, input")) return;
  endPress();
  press = { row, x: e.clientX, y: e.clientY, timer: setTimeout(() => beginDrag(), 380) };
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragUp);
  window.addEventListener("pointercancel", onDragUp);
});
$("meals").addEventListener("touchstart", e => {
  const row = e.target.closest(".item.draggable");
  if (!row || e.touches.length > 1 || e.target.closest("button, select, input")) { endPress(); return; }
  endPress();
  const t = e.touches[0];
  press = { row, x: t.clientX, y: t.clientY, touch: true, timer: setTimeout(() => beginDrag(), 380) };
}, { passive: true });
document.addEventListener("touchmove", e => {
  const t = e.touches[0]; if (!t) return;
  if (drag) { e.preventDefault(); drag.x = t.clientX; drag.y = t.clientY; placeGhost(); return; }
  if (press && press.touch && Math.hypot(t.clientX - press.x, t.clientY - press.y) > 8) endPress();
}, { passive: false });
document.addEventListener("touchend", e => { if (drag) { e.preventDefault(); onDragUp(); } else if (press && press.touch) endPress(); }, { passive: false });
document.addEventListener("touchcancel", () => { if (drag) onDragUp(); else if (press && press.touch) endPress(); });
function beginDrag(){
  if (!press) return;
  const row = press.row, r = row.getBoundingClientRect();
  const ghost = document.createElement("div"); ghost.className = "drag-ghost";
  ghost.style.width = r.width + "px"; ghost.style.left = r.left + "px";
  ghost.innerHTML = row.innerHTML; ghost.querySelectorAll("input,button,select").forEach(n => n.remove());
  document.body.appendChild(ghost);
  drag = { row, ghost, info: itemFromRow(row), dy: press.y - r.top, x: press.x, y: press.y, target: null, raf: 0 };
  row.classList.add("dragging"); 
  if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
  placeGhost(); autoScroll();
}
function placeGhost(){
  if (!drag) return;
  drag.ghost.style.top = (drag.y - drag.dy) + "px";
  const el = document.elementFromPoint(drag.x, drag.y);
  const card = el && el.closest(".meal-card");
  if (drag.target && drag.target !== card) drag.target.classList.remove("drop-target");
  drag.target = card && card.dataset.meal !== drag.info.from ? card : null;
  if (drag.target) drag.target.classList.add("drop-target");
}
function autoScroll(){
  if (!drag) return;
  const edge = 90, bottom = innerHeight - 110;
  let v = 0;
  if (drag.y < edge) v = -Math.ceil((edge - drag.y) / 6);
  else if (drag.y > bottom) v = Math.ceil((drag.y - bottom) / 6);
  if (v) { window.scrollBy(0, v); placeGhost(); }
  drag.raf = requestAnimationFrame(autoScroll);
}
function onDragMove(e){
  if (drag) { drag.x = e.clientX; drag.y = e.clientY; placeGhost(); return; }
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) endPress();
}
function onDragUp(){
  if (!drag) { endPress(); return; }
  placeGhost();
  const to = drag.target?.dataset.meal, info = drag.info;
  finishDrag();
  if (to) moveItem(info, to); else openMoveSheet(info);
}
function itemName(info){ return info.kind === "extra" ? day.extras[info.idx]?.name : PRESET[info.id]?.name; }
function mealTitle(k){ return (MEALS.find(m => m.key === k)?.title || "기타").split(" · ")[0]; }
function moveItem(info, to){
  const name = itemName(info);
  if (info.kind === "extra") { const x = day.extras[info.idx]; if (!x) return; x.meal = to; }
  else { const it = PRESET[info.id]; if (!it) return; day.checks[it.id] = false; day.extras.push({ name: it.name, sub: it.sub || "", kcal: it.kcal, protein: it.protein, carb: it.carb, fat: it.fat, sodium: it.sodium, meal: to }); }
  render(); scheduleSave();
  const jong = w => { const c = String(w).trim(), code = c.charCodeAt(c.length - 1) - 0xAC00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  const j1 = jong(name), j2 = jong(mealTitle(to));
  toast(`${name}${j1 > 0 ? "을" : j1 === 0 ? "를" : "을(를)"} ${mealTitle(to)}${j2 > 0 && j2 !== 8 ? "으로" : "로"} 옮겼어요`);
}
function openMoveSheet(info){
  const name = itemName(info); if (!name) return;
  const bg = document.createElement("div"); bg.className = "sheet-bg";
  const sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-label", "끼니 옮기기");
  const h = document.createElement("h3"); h.textContent = `${name} 어디로 옮길까요?`; sh.appendChild(h);
  for (const m of MEALS) {
    if (m.key === info.from) continue;
    const b = document.createElement("button"); b.className = "btn soft"; b.textContent = mealTitle(m.key);
    b.onclick = () => { bg.remove(); moveItem(info, m.key); };
    sh.appendChild(b);
  }
  const c = document.createElement("button"); c.className = "btn"; c.textContent = "취소"; c.onclick = () => bg.remove(); sh.appendChild(c);
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  bg.appendChild(sh); document.body.appendChild(bg);
  setTimeout(() => sh.querySelector("button")?.focus(), 50);
}
let toastTimer = 0;
function toast(msg){
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2200);
}
function finishDrag(){
  cancelAnimationFrame(drag.raf);
  drag.ghost.remove(); drag.row.classList.remove("dragging");
  if (drag.target) drag.target.classList.remove("drop-target");
  
  drag = null; swallowClick = true; setTimeout(() => { swallowClick = false; }, 400);
  endPress();
}
// 드래그 중엔 화면 스크롤 막기, 끝난 뒤 눌림(체크 토글) 막기
document.addEventListener("click", e => { if (swallowClick && !e.target.closest(".sheet-bg")) { e.preventDefault(); e.stopPropagation(); swallowClick = false; } }, true);
document.addEventListener("contextmenu", e => { if (press || drag) e.preventDefault(); });

function addWater(ml){ day.water = Math.max(0, day.water + ml); render(); scheduleSave(); }
$("w250").onclick = () => addWater(500);
$("w500").onclick = () => addWater(1000);
$("wminus").onclick = () => addWater(-500);

// ---------- AI ----------
function mealNow(){ const h = new Date().getHours(); return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 19 ? "pre" : "dinner"; }
function personLine(){
  const b = latestBody(profile) || {};
  return `${profile.age || ""}세 ${profile.sex === "f" ? "여성" : "남성"}(${profile.height}cm, ${b.weight || "?"}kg, 목표 ${GOALS[profile.goal] || "다이어트"}, 웨이트 운동 중${profile.notes ? ", " + profile.notes : ""})`;
}
function workoutLine(w){
  const ex = (w.exercises || []).map(e => isCardio(e) ? `${e.name} ${e.minutes || 0}분` : `${e.name} ${(e.sets||[]).filter(s => +s.reps).map(s => `${s.kg || 0}kg×${s.reps}`).join(", ")}`);
  return ex.length ? ex.join(" / ") : (partsOf(w).join(", ") || "안 함");
}

async function aiEstimate(text, photo, meal){
  const prompt = `${personLine()}이 먹은 음식이야.
${text ? (photo ? "사진을 보고 음식을 알아보되, 먹은 사람이 덧붙인 말을 양·재료 판단에 우선 반영해줘: " : "설명: ") + text : "사진을 보고 음식을 알아봐줘."}
사진에 영양성분표가 있으면 그 숫자를 그대로 써. 없으면 설명한 양(없으면 1인분) 기준으로 추정해서 JSON 하나만 답해:
{"name":"음식 이름(짧게)","kcal":숫자,"protein":숫자(g),"carb":숫자(g),"fat":숫자(g),"sodium":숫자(mg),"note":"이 음식 기준으로 부족하거나 주의할 점 한 줄"}`;
  const opts = {}; if (photo) opts.images = [photo];
  const r = await sample.json(prompt, opts);
  return { name: String(r.name || text || "음식"), kcal: Math.round(+r.kcal || 0), protein: Math.round(+r.protein || 0),
    carb: Math.round(+r.carb || 0), fat: Math.round(+r.fat || 0), sodium: Math.round(+r.sodium || 0), note: String(r.note || ""), meal, ai: true };
}
$("review").onclick = async () => {
  if (!sample) { $("aiStatus").textContent = aiOffMsg(); return; }
  const eaten = [
    ...Object.entries(day.checks).filter(([,v]) => v).map(([id]) => PRESET[id]?.name).filter(Boolean),
    ...day.extras.map(x => x.name)
  ];
  const t = totalsOf(day);
  $("aiStatus").textContent = "식단을 보고 있어요…";
  const fb = $("feedback"); fb.hidden = false; fb.textContent = "";
  try {
    const r = await sample(`${personLine()}의 하루 식단이야.
먹은 것: ${eaten.join(", ") || "아직 없음"}
운동: ${workoutLine(day.workout)} (추정 소모 ${t.burn}kcal)
합계: ${t.kcal}kcal, 단백질 ${t.protein}g, 탄수화물 ${t.carb}g, 지방 ${t.fat}g, 나트륨 ${t.sodium}mg, 물 ${t.water}ml
목표: ${TARGET.kcal}kcal, 단백질 ${TARGET.protein}g, 탄수화물 ${TARGET.carb}g, 지방 ${TARGET.fat}g, 나트륨 ${TARGET.sodium}mg 이하, 물 ${TARGET.water}ml
부족한 영양소와 다음 날 바꾸면 좋을 점을 한국어로 3줄 이내, 편하게 말해줘. 구체적인 음식 예시 포함.`,
      { onText: ({ text }) => { fb.textContent = text; } });
    fb.textContent = r.text;
    $("aiStatus").textContent = "";
  } catch (e) {
    fb.hidden = true;
    $("aiStatus").textContent = "피드백을 불러오지 못했어요";
  }
};

// ---------- 운동 ----------
(function buildChips(){
  const box = $("partChips");
  for (const p of PARTS) {
    const id = "pp-" + p;
    const inp = document.createElement("input"); inp.type = "radio"; inp.name = "pickPart"; inp.id = id; inp.value = p; inp.checked = p === pickPart;
    const lb = document.createElement("label"); lb.htmlFor = id; lb.textContent = p;
    inp.onchange = () => { pickPart = p; renderExList(); };
    box.append(inp, lb);
  }
})();

// 지난번 같은 운동 기록 찾기 (세트 미리 채우기용)
function lastSetsFor(name){
  const cur = keyOf(current);
  const keys = Object.keys(cache).filter(k => k < cur).sort().reverse();
  for (const k of keys) {
    const e = (cache[k].workout?.exercises || []).find(x => x.name === name);
    if (e) return e;
  }
  return null;
}
function addExercise(name, part){
  const w = day.workout;
  const idx = w.exercises.findIndex(e => e.name === name);
  if (idx >= 0) {
    const e = w.exercises[idx];
    const hasData = isCardio(e) ? false : (e.sets || []).some(x => +x.reps > 0 && e.from !== "last");
    if (hasData) { $("wSaved").textContent = "기록한 세트가 있어요 · 아래 목록에서 ×로 지워주세요"; return; }
    w.exercises.splice(idx, 1);
    w.parts = partsOf(w);
    $("wSaved").textContent = `${name} 뺐어요`;
    render(true); onWorkoutEdit(); return;
  }
  const prev = lastSetsFor(name);
  if (isCardio({ name, part })) w.exercises.push({ name, part, minutes: prev?.minutes || (EX_INFO[name]?.[1] === "warm" ? 5 : "") });
  else {
    const sets = prev?.sets?.length ? prev.sets.map(s => ({ kg: s.kg, reps: s.reps, done: false })) : [{ kg: "", reps: "", done: false }];
    w.exercises.push({ name, part, sets, from: prev ? "last" : "" });
  }
  w.parts = partsOf(w);
  $("wSaved").textContent = "저장 중…";
  render(true); scheduleSave();
}
function exRow(name, part, done){
  const row = document.createElement("div"); row.className = "ex-row";
  const b = document.createElement("button"); b.className = "ex-pick" + (done.has(name) ? " on" : "");
  const t = document.createElement("span"); t.className = "t"; t.textContent = name;
  const info = EX_INFO[name];
  if (info) { const d = document.createElement("small"); d.textContent = info[2]; t.appendChild(d); }
  const prev = lastSetsFor(name);
  if (prev) { const sm = document.createElement("small"); sm.className = "last"; sm.textContent = isCardio(prev) ? `지난번 ${prev.minutes || 0}분` : `지난번 ${(prev.sets||[]).filter(x => +x.reps).map(x => `${x.kg || 0}×${x.reps}`).slice(0, 3).join(", ")}`; t.appendChild(sm); }
  const plus = document.createElement("span"); plus.className = "plus"; plus.textContent = done.has(name) ? "✓" : "+";
  b.append(icoEl(name), t, plus);
  b.setAttribute("aria-label", done.has(name) ? `${name}, 추가됨` : `${name} 추가`);
  b.onclick = () => addExercise(name, part);
  const yt = document.createElement("a"); yt.className = "yt"; yt.textContent = "자세";
  yt.href = "https://www.youtube.com/results?search_query=" + encodeURIComponent(name + " 자세"); yt.target = "_blank"; yt.rel = "noopener";
  yt.setAttribute("aria-label", `${name} 자세 영상 찾아보기`);
  row.append(b, yt); return row;
}
function renderRoutines(){
  const box = $("myRoutines"); box.innerHTML = "";
  const list = profile.routines || [];
  $("saveRoutine").hidden = !day.workout.exercises.length;
  if (!list.length) return;
  box.appendChild(foldGroup("routines", "내 루틴", list.map(r => r.name), new Set(), false, body => {
    list.forEach((r, ri) => {
      const row = document.createElement("div"); row.className = "ex-row";
      const t = document.createElement("div"); t.className = "ex-pick"; t.style.cursor = "default";
      const tt = document.createElement("span"); tt.className = "t"; tt.textContent = r.name;
      const sm = document.createElement("small"); sm.textContent = r.items.map(x => x.name).join(" · "); tt.appendChild(sm); t.appendChild(tt);
      const load = document.createElement("button"); load.className = "yt"; load.style.color = "var(--accent)"; load.textContent = "불러오기";
      load.onclick = () => { let n = 0; for (const it of r.items) if (!day.workout.exercises.some(e => e.name === it.name)) { addExercise(it.name, it.part); n++; } toast(n ? `${r.name} 불러왔어요 · ${n}개` : "이미 다 들어 있어요"); };
      const del = document.createElement("button"); del.className = "del"; del.setAttribute("aria-label", r.name + " 루틴 삭제"); del.textContent = "×";
      del.onclick = () => { profile.routines.splice(ri, 1); saveProfile(); renderRoutines(); };
      row.append(t, load, del); body.appendChild(row);
    });
  }));
}
$("saveRoutine").onclick = () => {
  const ex = day.workout.exercises; if (!ex.length) return;
  const { sh, close } = makeSheet("내 루틴으로 저장");
  const inp = document.createElement("input"); inp.id = "routineName"; inp.className = "routine-name";
  inp.value = `${partsOf(day.workout).filter(p => p !== "유산소").join("·") || "자유"} 루틴`; inp.setAttribute("aria-label", "루틴 이름");
  const p = document.createElement("p"); p.className = "status"; p.textContent = ex.map(e => e.name).join(" · ");
  const ok = document.createElement("button"); ok.className = "btn primary"; ok.textContent = "저장하기";
  ok.onclick = () => {
    const name = inp.value.trim() || "내 루틴";
    profile.routines = (profile.routines || []).filter(r => r.name !== name);
    profile.routines.push({ name, items: ex.map(e => ({ name: e.name, part: e.part })) });
    saveProfile(); close(); toast(`${name} 저장했어요 · 운동 고르기 맨 위에서 불러올 수 있어요`);
  };
  const c = document.createElement("button"); c.className = "btn"; c.textContent = "취소"; c.onclick = close;
  sh.append(inp, p, ok, c); setTimeout(() => inp.select(), 60);
};
function setPickPart(p){ pickPart = p; const r = $("pp-" + p); if (r) r.checked = true; renderExList(); }
const foldOpen = new Map();   // 펼친 목록 기억 (화면을 다시 그려도 유지)
function foldGroup(key, title, names, done, defOpen, fill){
  const d = document.createElement("details"); d.className = "fold";
  d.open = foldOpen.has(key) ? foldOpen.get(key) : defOpen;
  const sm = document.createElement("summary");
  const t = document.createElement("span"); t.className = "fold-t"; t.textContent = title;
  const n = names.filter(x => done.has(x)).length;
  const c = document.createElement("span"); c.className = "fold-c"; c.textContent = n ? `${n}개 추가됨 · ${names.length}개` : `${names.length}개`;
  sm.append(t, c); d.appendChild(sm);
  const body = document.createElement("div"); body.className = "fold-b"; d.appendChild(body);
  let filled = false;
  const ensure = () => { if (d.open && !filled) { fill(body); filled = true; } };
  d.addEventListener("toggle", () => { foldOpen.set(key, d.open); ensure(); });
  ensure();
  return d;
}
function renderExList(){
  const done = new Set(day.workout.exercises.map(e => e.name));
  // 같이 하면 좋은 부위
  const c = COMBOS[pickPart], combo = $("combo"); combo.innerHTML = "";
  if (c) {
    const tx = document.createElement("span"); tx.innerHTML = ""; const b = document.createElement("b"); b.textContent = "같이 하면 좋아요 "; tx.append(b, document.createTextNode(c.why)); combo.appendChild(tx);
    for (const p of c.with) { const btn = document.createElement("button"); btn.textContent = `+ ${p}`; btn.onclick = () => setPickPart(p); combo.appendChild(btn); }
  }
  // 추천 루틴 + 종류별 전체 목록 — 전부 접었다 펴는 목록
  const reco = $("reco"); reco.innerHTML = "";
  const groups = ROUTINE[pickPart] || [];
  const recoNames = groups.flatMap(([, names]) => names);
  reco.appendChild(foldGroup(`${pickPart}:reco`, `${pickPart} 추천 루틴`, recoNames, done, false, body => {
    for (const [label, names] of groups) {
      const g = document.createElement("p"); g.className = "ex-group"; g.textContent = label; body.appendChild(g);
      for (const n of names) body.appendChild(exRow(n, pickPart, done));
    }
    const all = document.createElement("button"); all.className = "btn primary"; all.style.cssText = "width:100%;height:44px;margin:10px 0 6px";
    const left = recoNames.filter(n => !done.has(n));
    all.textContent = left.length ? `추천 루틴 한 번에 넣기 (${left.length}개)` : "추천 루틴 다 넣었어요";
    all.disabled = !left.length;
    all.onclick = () => { for (const n of recoNames) if (!day.workout.exercises.some(e => e.name === n)) addExercise(n, pickPart); };
    body.appendChild(all);
  }));

}

// ---------- 다음 운동 추천 ----------
const MAIN_PARTS = ["가슴", "등", "어깨", "하체", "팔"];
function allDayKeys(){
  const ks = new Set(Object.keys(cache)); ks.add(keyOf(current));
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("meal-note:") && isDayKey(k.slice(10))) ks.add(k.slice(10)); } } catch {}
  return [...ks].sort();
}
const dayNum = k => Math.round(new Date(k + "T00:00:00").getTime() / 86400000);
function renderNext(){
  const baseK = keyOf(current), base = dayNum(baseK);
  const todayParts = partsOf(day.workout).filter(p => p !== "유산소");
  const inProgress = !!day.workout.startedAt;
  const workedToday = todayParts.length > 0 && !inProgress;   // 운동 종료(또는 시간 안 재고 기록만)한 뒤에만 '내일'
  const target = workedToday ? base + 1 : base;
  const last = {};
  for (const k of allDayKeys()) { const dn = dayNum(k); if (dn > base || (!workedToday && dn === base)) continue; for (const p of partsOf(dayData(k)?.workout)) last[p] = Math.max(last[p] ?? -Infinity, dn); }
  const gap = p => last[p] == null ? Infinity : target - last[p];
  const ready = MAIN_PARTS.filter(p => gap(p) >= 2).sort((a, b) => gap(b) - gap(a));
  let streak = 0; for (let d = base; ; d--) { const k = allDayKeys().find(x => dayNum(x) === d); if (k && partsOf(dayData(k)?.workout).length) streak++; else break; if (streak > 7) break; }

  const when = workedToday ? "내일은" : "오늘은";
  $("nextTitle").textContent = workedToday ? "내일 운동 추천" : "오늘 운동 추천";
  let main = ready[0];
  if (workedToday && streak >= 4) {
    $("nextMain").innerHTML = `${when} <em>쉬는 날</em> 어때요`;
    $("nextWhy").textContent = `${streak}일 연속 운동했어요. 하루 쉬면 근육이 회복되면서 더 커져요. 쉬는 날엔 가볍게 걷기 30분 정도면 좋아요.`;
  } else if (!main) {
    $("nextMain").innerHTML = `${when} <em>복근 + 유산소</em>`;
    $("nextWhy").textContent = "큰 부위는 아직 회복 중이에요. 가볍게 복근이랑 경사 걷기로 채워보세요.";
    main = "복근";
  } else {
    const partner = (COMBOS[main]?.with || []).find(p => p === "복근" || ready.includes(p));
    const g = gap(main), restTxt = g === Infinity ? "은 아직 기록이 없어요" : `은 ${g}일째 쉬고 있어요`;
    if (workedToday) {
      $("nextMain").innerHTML = `내일은 <em>${main}${partner ? " + " + partner : ""}</em>`;
      $("nextWhy").textContent = `오늘 ${todayParts.join(", ")} 했으니까 ${main}${restTxt}. ${COMBOS[main]?.why || ""}`;
    } else if (todayParts.length) {
      // 운동 중: 지금 하는 부위 기준으로 같이 하면 좋은 부위 추천
      const now = todayParts[0], add = (COMBOS[now]?.with || []).find(p => !todayParts.includes(p) && (p === "복근" || gap(p) >= 2));
      $("nextTitle").textContent = "오늘 운동 추천";
      $("nextMain").innerHTML = add ? `지금 ${now} 하는 중 · <em>${add}</em>도 같이 어때요?` : `오늘은 <em>${todayParts.join(" + ")}</em> 잘하고 있어요`;
      $("nextWhy").textContent = add ? `${COMBOS[now]?.why || ""} · 끝나면 유산소 15~20분 붙이면 소모 목표 채우기 좋아요` : "마무리로 유산소 15~20분 하면 소모 목표 채우기 좋아요";
      main = add || "유산소";
    } else {
      $("nextMain").innerHTML = `오늘은 <em>${main}${partner ? " + " + partner : ""}</em> 해보는 거 어때요?`;
      $("nextWhy").textContent = `${main}${restTxt}. ${COMBOS[main]?.why || ""}`;
    }
  }
  $("nextGo").hidden = !main;
  $("nextGo").textContent = `${main || ""} 운동 고르기`;
  $("nextGo").onclick = () => openExSheet(main);
  const rc = $("recover"); rc.innerHTML = "";
  for (const p of MAIN_PARTS) {
    const d = document.createElement("div"); const g = gap(p);
    d.className = g >= 2 ? "ok" : ""; d.textContent = p;
    const sp = document.createElement("span"); sp.textContent = g === Infinity ? "기록 없음" : g >= 2 ? "준비 완료" : "회복 중";
    d.appendChild(sp); rc.appendChild(d);
  }
}

// 초성 검색: "ㄹㅍㄷ" → 랫 풀다운
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
function chosung(str){ return [...str].map(ch => { const c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join(""); }
function matchQ(name, q){
  q = q.replace(/\s/g, ""); if (!q) return true;
  const n = name.replace(/\s/g, "");
  return n.includes(q) || chosung(n).includes(q);
}
function allExercises(){
  const map = new Map();
  for (const p of PARTS) for (const n of EXERCISES[p]) if (!map.has(n)) map.set(n, p);
  for (const k of allDayKeys()) for (const e of dayData(k)?.workout?.exercises || []) if (!map.has(e.name)) map.set(e.name, e.part || "기타");
  return [...map].map(([name, part]) => ({ name, part, kind: EX_INFO[name]?.[1] || (part === "유산소" ? "cardio" : "free") }));
}
function lastDone(name){
  const cur = dayNum(keyOf(new Date()));
  for (const k of allDayKeys().slice().reverse()) {
    const e = dayData(k)?.workout?.exercises?.find(x => x.name === name);
    if (e && (isCardio(e) ? +e.minutes > 0 : (e.sets || []).some(x => +x.reps > 0))) { const d = cur - dayNum(k); return d <= 0 ? 0 : d; }
  }
  return null;
}
let sheetPart = "전체", sheetKind = "전체";
function openExSheet(part){
  if (part && (PARTS.includes(part))) sheetPart = part;
  const { sh, close } = makeSheet("종목 추가");
  sh.classList.add("ex-sheet");
  const q = document.createElement("input"); q.type = "search"; q.className = "ex-search"; q.id = "exSearch"; q.placeholder = "종목 이름 검색 (예: ㄹㅍㄷ)"; q.setAttribute("aria-label", "종목 검색");
  const kinds = document.createElement("div"); kinds.className = "hscroll";
  const parts = document.createElement("div"); parts.className = "hscroll";
  const list = document.createElement("div"); list.className = "ex-list";
  const done = document.createElement("button"); done.className = "btn primary"; done.textContent = "완료"; done.onclick = close;
  const chip = (label, active, on) => { const b = document.createElement("button"); b.className = "fchip" + (active ? " on" : ""); b.textContent = label; b.setAttribute("aria-pressed", active); b.onclick = on; return b; };
  const draw = () => {
    kinds.innerHTML = ""; parts.innerHTML = "";
    for (const k of ["전체", ...Object.keys(KINDS)]) kinds.appendChild(chip(k === "전체" ? "모든 도구" : KINDS[k], sheetKind === k, () => { sheetKind = k; draw(); }));
    for (const p of ["전체", ...PARTS]) parts.appendChild(chip(p, sheetPart === p, () => { sheetPart = p; draw(); }));
    list.innerHTML = "";
    const have = new Set(day.workout.exercises.map(e => e.name));
    let items = allExercises().filter(x => (sheetPart === "전체" || (EXERCISES[sheetPart] || []).includes(x.name) || x.part === sheetPart) && (sheetKind === "전체" || x.kind === sheetKind) && matchQ(x.name, q.value));
    items = items.map(x => ({ ...x, ago: lastDone(x.name) })).sort((a, b) => (a.ago ?? 9999) - (b.ago ?? 9999));
    if (!items.length) {
      const name = q.value.trim();
      const e = document.createElement("p"); e.className = "empty"; e.textContent = name ? "찾는 운동이 없어요" : "조건에 맞는 운동이 없어요"; list.appendChild(e);
      if (name) { const add = document.createElement("button"); add.className = "btn soft"; add.style.cssText = "width:100%;margin-top:10px"; add.textContent = `'${name}' 직접 추가하기`;
        add.onclick = () => { addExercise(name, sheetPart === "전체" ? pickPart : sheetPart); q.value = ""; draw(); toast(`${name} 추가했어요`); }; list.appendChild(add); }
    }
    for (const x of items) {
      const row = document.createElement("div"); row.className = "ex-row";
      const b = document.createElement("button"); b.className = "ex-pick" + (have.has(x.name) ? " on" : "");
      const t = document.createElement("span"); t.className = "t"; t.textContent = x.name;
      const sm = document.createElement("small"); sm.textContent = `${x.part} · ${KINDS[x.kind] || ""}` + (x.ago == null ? "" : x.ago === 0 ? " · 오늘" : ` · ${x.ago}일 전`); if (x.ago != null) sm.className = "last"; t.appendChild(sm);
      const plus = document.createElement("span"); plus.className = "plus"; plus.textContent = have.has(x.name) ? "✓" : "+";
      b.append(icoEl(x.name), t, plus);
      b.setAttribute("aria-label", have.has(x.name) ? `${x.name}, 추가됨 · 누르면 빼기` : `${x.name} 추가`);
      b.onclick = () => { addExercise(x.name, x.part); draw(); };
      row.appendChild(b); list.appendChild(row);
    }
  };
  q.oninput = draw;
  sh.append(q, kinds, parts, list, done);
  draw();
}
$("fabAdd").onclick = () => openExSheet(null);
$("openAll").onclick = () => openExSheet(pickPart);

function unitInput(value, unit, label, onInput, mode){
  const wrap = document.createElement("div"); wrap.className = "unit-in";
  const inp = document.createElement("input"); inp.type = "number"; inp.inputMode = mode || "decimal"; inp.value = value ?? ""; inp.placeholder = "0"; inp.setAttribute("aria-label", label);
  inp.oninput = () => onInput(inp.value);
  const u = document.createElement("span"); u.textContent = unit;
  wrap.append(inp, u); return wrap;
}
function exNums(e){
  if (!e) return null;
  if (isCardio(e)) return { min: +e.minutes || 0 };
  const k = PER_SIDE.has(e.name) ? 2 : 1, done = (e.sets || []).filter(x => +x.reps > 0 && x.done !== false);
  if (!done.length) return null;
  return { maxKg: Math.max(...done.map(x => +x.kg || 0)), vol: done.reduce((a, x) => a + (+x.kg || 0) * (+x.reps || 0), 0) * k, reps: done.reduce((a, x) => a + (+x.reps || 0), 0) };
}
function progInfo(e){
  const prev = lastSetsFor(e.name), a = exNums(e), b = exNums(prev);
  if (!prev) return { text: "첫 기록이에요", cls: "" };
  if (!isCardio(e) && e.from === "last" && b) {
    const ps = (prev.sets || []).filter(x => +x.reps > 0 && x.done !== false);
    const allHigh = ps.length && ps.every(x => +x.reps >= 12);
    const top = Math.max(...ps.map(x => +x.kg || 0)), step = top >= 20 ? 2.5 : 1;
    return { text: allHigh ? `지난번 전부 12회 넘겼어요 · 오늘은 ${one(top + step).replace(".0", "")}kg 도전해봐요` : "지난번 기록으로 채웠어요 · 같은 무게로 횟수 1~2개 더 해봐요", cls: allHigh ? "up" : "" };
  }
  if (!a || !b) return { text: "", cls: "" };
  if (isCardio(e)) { const d = a.min - b.min; return d ? { text: `지난번보다 ${d > 0 ? "+" : ""}${d}분`, cls: d > 0 ? "up" : "down" } : { text: "지난번과 같아요", cls: "" }; }
  if (e.from === "last") {
    const ps = (prev.sets || []).filter(x => +x.reps > 0 && x.done !== false);
    const allHigh = ps.length && ps.every(x => +x.reps >= 12);
    const top = Math.max(...ps.map(x => +x.kg || 0));
    const step = top >= 20 ? 2.5 : 1;
    return { text: allHigh ? `지난번 전부 12회 넘겼어요 · 오늘은 ${one(top + step).replace(".0", "")}kg 도전해봐요` : "지난번 기록으로 채웠어요 · 같은 무게로 횟수 1~2개 더 해봐요", cls: allHigh ? "up" : "" };
  }
  const dk = Math.round((a.maxKg - b.maxKg) * 10) / 10, dv = Math.round(a.vol - b.vol);
  const parts = [];
  if (dk) parts.push(`최고 무게 ${dk > 0 ? "+" : ""}${dk}kg`);
  if (dv) parts.push(`볼륨 ${dv > 0 ? "+" : ""}${fmt(dv)}kg`);
  if (!parts.length) return { text: "지난번과 같아요", cls: "" };
  return { text: "지난번보다 " + parts.join(" · "), cls: dk > 0 || (!dk && dv > 0) ? "up" : dk < 0 || dv < 0 ? "down" : "" };
}
function exStatsText(e){
  if (isCardio(e)) { const k = Math.round((CARDIO_MET[e.name] || 6) * (TARGET.weight || 70) * (+e.minutes || 0) / 60); return k ? `약 ${k} kcal` : ""; }
  const v = (e.sets || []).filter(s => s.done !== false).reduce((a, s) => a + (+s.kg || 0) * (+s.reps || 0), 0) * (PER_SIDE.has(e.name) ? 2 : 1);
  return v ? `${fmt(v)} kg` : "";
}
let restEnd = 0, restTotal = 90, restTick = 0;
function startRest(sec){
  restTotal = sec || restTotal; restEnd = Date.now() + restTotal * 1000;
  let el = $("rest");
  if (!el) {
    el = document.createElement("div"); el.className = "rest"; el.id = "rest";
    el.innerHTML = '<div class="rest-in"><i class="rest-bar" id="restBar"></i><div class="rest-t" id="restT"></div><button id="restMinus" aria-label="15초 줄이기">−15</button><button id="restPlus" aria-label="15초 늘리기">+15</button><button id="restX" aria-label="휴식 타이머 닫기">✕</button></div>';
    document.body.appendChild(el);
    $("restMinus").onclick = () => { restEnd -= 15000; restTotal = Math.max(15, restTotal - 15); tickRest(); };
    $("restPlus").onclick = () => { restEnd += 15000; restTotal += 15; tickRest(); };
    $("restX").onclick = stopRest;
  }
  el.hidden = false; document.body.classList.add("resting"); clearInterval(restTick); restTick = setInterval(tickRest, 250); tickRest();
}
function stopRest(){ clearInterval(restTick); restEnd = 0; document.body.classList.remove("resting"); const el = $("rest"); if (el) el.hidden = true; }
function tickRest(){
  const left = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
  if ($("view-workout").hidden) { const el = $("rest"); if (el) el.hidden = true; } else if (restEnd) $("rest").hidden = false;
  $("restT").innerHTML = left ? `${Math.floor(left / 60)}:${pad(left % 60)}<small>휴식 중 · 숨 고르고 물 한 모금</small>` : `다음 세트 가요!<small>휴식 끝</small>`;
  $("restBar").style.width = (left / restTotal * 100) + "%";
  if (!left) { clearInterval(restTick); if (navigator.vibrate) { try { navigator.vibrate([120, 60, 120]); } catch {} } setTimeout(() => { if (restEnd && Date.now() > restEnd) stopRest(); }, 4000); }
}
function onWorkoutEdit(){ delete day.workout.kcal; $("wSaved").textContent = "저장 중…"; scheduleSave(); renderWorkoutSummary(); renderHome(); }

const exFold = new Map();
const seenEx = new Set();
function wasJustLoaded(fk){ if (seenEx.has(fk)) return false; seenEx.add(fk); return true; }
function e1rm(kg, reps){ return reps > 0 ? kg * (1 + Math.min(reps, 15) / 30) : 0; }
function historyFor(name){
  const cur = keyOf(current), out = [];
  for (const k of allDayKeys()) {
    if (k > cur) continue;
    const e = (k === cur ? day : dayData(k))?.workout?.exercises?.find(x => x.name === name);
    if (!e || isCardio(e)) continue;
    const done = (e.sets || []).filter(x => +x.reps > 0 && x.done !== false);
    if (!done.length) continue;
    const best = done.reduce((a, x) => e1rm(+x.kg || 0, +x.reps) > e1rm(+a.kg || 0, +a.reps) ? x : a);
    out.push({ k, best, rm: e1rm(+best.kg || 0, +best.reps), vol: exNums(e).vol });
  }
  return out.slice(-6);
}
function historyFold(e){
  const d = document.createElement("details"); d.className = "hist";
  const sm = document.createElement("summary"); sm.textContent = "이 운동 기록 · 추정 1RM"; d.appendChild(sm);
  d.addEventListener("toggle", () => {
    if (!d.open || d.dataset.filled) return; d.dataset.filled = 1;
    const h = historyFor(e.name);
    if (!h.length) { const p = document.createElement("p"); p.className = "note"; p.textContent = "세트를 체크하면 여기에 기록이 쌓여요"; d.appendChild(p); return; }
    const W = 300, H = 70, lo = Math.min(...h.map(x => x.rm)), hi = Math.max(...h.map(x => x.rm)), span = Math.max(1, hi - lo);
    const X = i => h.length === 1 ? W / 2 : 14 + i * (W - 28) / (h.length - 1), Y = v => 52 - (v - lo) / span * 34;
    let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${e.name} 추정 1RM 변화"><polyline fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" points="${h.map((x, i) => `${X(i).toFixed(1)},${Y(x.rm).toFixed(1)}`).join(" ")}"/>`;
    h.forEach((x, i) => { svg += `<circle cx="${X(i).toFixed(1)}" cy="${Y(x.rm).toFixed(1)}" r="3.5" fill="var(--accent)"/><text class="ch-val" x="${X(i).toFixed(1)}" y="${(Y(x.rm) - 8).toFixed(1)}" text-anchor="middle">${one(x.rm)}</text><text class="ch-date" x="${X(i).toFixed(1)}" y="${H - 2}" text-anchor="middle">${x.k.slice(5).replace("-", ".")}</text>`; });
    d.insertAdjacentHTML("beforeend", svg + "</svg>");
    const rows = document.createElement("div"); rows.className = "rows";
    for (const x of h.slice().reverse()) {
      const r = document.createElement("div"); r.className = "row";
      const a = document.createElement("span"); a.textContent = `${x.k.slice(5).replace("-", ".")} · 최고 ${x.best.kg || 0}kg × ${x.best.reps}`;
      const b = document.createElement("b"); b.textContent = `${one(x.rm)}kg`;
      r.append(a, b); rows.appendChild(r);
    }
    d.appendChild(rows);
    const n = document.createElement("p"); n.className = "note"; n.textContent = "추정 1RM: 한 번에 들 수 있는 최대 무게를 세트 기록으로 계산한 값 (Epley 공식)"; d.appendChild(n);
  });
  return d;
}
function renderLog(){
  const box = $("wLog"); box.innerHTML = "";
  const w = day.workout;
  if (!w.exercises.length) {
    const p = document.createElement("p"); p.className = "empty";
    p.textContent = partsOf(w).length ? `${partsOf(w).join(", ")} 운동한 날이에요. 위에서 종목을 고르면 세트까지 기록할 수 있어요` : "위에서 부위를 고르고 운동을 눌러 추가하세요";
    box.appendChild(p); return;
  }
  w.exercises.forEach((e, ei) => {
    const ex = document.createElement("div"); ex.className = "ex";
    const fk = keyOf(current) + ":" + e.name;
    const allDone = !isCardio(e) && (e.sets || []).length && e.sets.every(x => x.done !== false && +x.reps > 0);
    const collapsed = exFold.has(fk) ? exFold.get(fk) : allDone && e.from !== "last" && exFold.get(fk + ":auto") !== false && wasJustLoaded(fk);
    if (collapsed) ex.classList.add("folded");
    const head = document.createElement("div"); head.className = "ex-head";
    head.onclick = ev => { if (ev.target.closest("button")) return; exFold.set(fk, !ex.classList.contains("folded")); ex.classList.toggle("folded"); };
    const h = document.createElement("h3"); h.textContent = e.name;
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = PER_SIDE.has(e.name) ? `${e.part} · 한쪽` : e.part;
    const st = document.createElement("span"); st.className = "ex-sub"; st.textContent = exStatsText(e);
    const del = document.createElement("button"); del.className = "del"; del.setAttribute("aria-label", e.name + " 삭제"); del.textContent = "×";
    del.onclick = () => { w.exercises.splice(ei, 1); w.parts = partsOf(w); render(true); onWorkoutEdit(); };
    const chev = document.createElement("span"); chev.className = "ex-chev"; chev.setAttribute("aria-hidden", "true");
    head.append(icoEl(e.name), h, tag, st, chev, del); ex.appendChild(head);
    const prog = document.createElement("p"); prog.className = "prog";
    const upd = () => { st.textContent = exStatsText(e); const pi = progInfo(e); prog.textContent = pi.text; prog.className = "prog " + pi.cls; prog.hidden = !pi.text; };
    upd(); ex.appendChild(prog);

    if (isCardio(e)) {
      const sets = document.createElement("div"); sets.className = "sets";
      const row = document.createElement("div"); row.className = "set"; row.style.gridTemplateColumns = "1fr";
      row.appendChild(unitInput(e.minutes, "분", e.name + " 시간", v => { e.minutes = v === "" ? "" : Math.max(0, +v); upd(); onWorkoutEdit(); }, "numeric"));
      sets.appendChild(row); ex.appendChild(sets);
    } else {
      const sets = document.createElement("div"); sets.className = "sets";
      e.sets.forEach((s, si) => {
        const row = document.createElement("div"); row.className = "set";
        const n = document.createElement("span"); n.className = "n"; n.textContent = si + 1;
        const kg = unitInput(s.kg, "kg", `${e.name} ${si+1}세트 무게`, v => { s.kg = v === "" ? "" : +v; e.from = ""; upd(); onWorkoutEdit(); });
        const reps = unitInput(s.reps, "회", `${e.name} ${si+1}세트 횟수`, v => { s.reps = v === "" ? "" : Math.max(0, Math.round(+v)); e.from = ""; upd(); onWorkoutEdit(); }, "numeric");
        const d = document.createElement("button"); d.className = "del"; d.setAttribute("aria-label", `${si+1}세트 삭제`); d.textContent = "−";
        d.onclick = () => { e.sets.splice(si, 1); if (!e.sets.length) e.sets.push({ kg: "", reps: "", done: false }); render(true); onWorkoutEdit(); };
        const ck = document.createElement("button"); ck.className = "set-check" + (s.done !== false ? " on" : "");
        ck.setAttribute("aria-label", `${si+1}세트 ${s.done !== false ? "완료 취소" : "완료"}`); ck.setAttribute("aria-pressed", s.done !== false);
        ck.textContent = "✓";
        ck.onclick = () => {
          if (s.done === false && !(+s.reps > 0)) { toast("횟수를 먼저 적어주세요"); return; }
          s.done = s.done === false; e.from = "";
          if (s.done) startRest();
          render(true); onWorkoutEdit();
        };
        if (s.done !== false) row.classList.add("done");
        row.append(n, kg, reps, ck, d); sets.appendChild(row);
      });
      ex.appendChild(sets);
      const add = document.createElement("button"); add.className = "add-set"; add.textContent = "+ 세트 추가";
      add.onclick = () => { const last = e.sets[e.sets.length - 1] || {}; e.sets.push({ kg: last.kg ?? "", reps: last.reps ?? "", done: false }); render(true); onWorkoutEdit(); };
      const allBtn = document.createElement("button"); allBtn.className = "add-set all"; allBtn.textContent = "✓✓ 전부 완료";
      allBtn.onclick = () => { e.sets.forEach(x => { if (+x.reps > 0) x.done = true; }); e.from = ""; exFold.set(fk, true); render(true); onWorkoutEdit(); };
      const btns = document.createElement("div"); btns.className = "set-btns"; btns.append(add, allBtn);
      ex.appendChild(btns);
      ex.appendChild(historyFold(e));
    }
    box.appendChild(ex);
  });
}

function fmtClock(ms){ const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60; return (h ? h + ":" + pad(m) : m) + ":" + pad(sec); }
function renderTimer(){
  const w = day.workout, isToday = keyOf(current) === keyOf(new Date());
  const clock = $("tClock"), btn = $("tBtn");
  if (w.startedAt) {
    clock.className = "timer-clock run";
    clock.innerHTML = `${fmtClock(Date.now() - w.startedAt)}<small>운동 중 · 누적 ${Math.round((w.minutes || 0) + (Date.now() - w.startedAt) / 60000)}분</small>`;
    btn.textContent = "운동 종료"; btn.className = "btn stop"; btn.hidden = false;
  } else {
    clock.className = "timer-clock";
    clock.innerHTML = w.minutes ? `${w.minutes}분<small>${isToday ? "이어서 하려면 다시 시작" : "이날 운동한 시간"}</small>` : `0:00<small>${isToday ? "시작 누르면 시간 재기 시작" : "기록된 시간이 없어요"}</small>`;
    btn.textContent = w.minutes ? "다시 시작" : "운동 시작"; btn.className = "btn primary"; btn.hidden = !isToday;
  }
}
$("tBtn").onclick = () => {
  const w = day.workout;
  if (w.startedAt) {
    w.minutes = Math.round((w.minutes || 0) + (Date.now() - w.startedAt) / 60000);
    w.startedAt = null;
    $("wSaved").textContent = `${w.minutes}분 기록했어요`;
  } else {
    w.startedAt = Date.now();
    $("wSaved").textContent = "시간 재는 중";
  }
  render(); onWorkoutEdit();
};
setInterval(() => {
  if (!day.workout.startedAt || $("view-workout").hidden && $("view-home").hidden) return;
  renderTimer();
  if (new Date().getSeconds() % 15 === 0) { renderWorkoutSummary(); renderHome(); }
}, 1000);

function renderWorkoutSummary(){
  const ws = workoutStats(day.workout);
  const isToday = keyOf(current) === keyOf(new Date());
  $("wHeroTitle").textContent = isToday ? "오늘 들어 올린 무게" : `${current.getMonth()+1}월 ${current.getDate()}일 들어 올린 무게`;
  $("wVolume").textContent = fmt(ws.volume);
  renderTimer();
  $("wSets").innerHTML = ws.sets == null ? `${day.workout.summary?.count || "-"}<small>종목</small>` : `${ws.sets}<small>세트</small>`;
  $("wTime").innerHTML = `${ws.minutes}<small>분</small>`;
  $("wKcal").innerHTML = `${fmt(ws.kcal)}<small>kcal</small>`;
  const left = TARGET.burn - ws.kcal;
  $("wBurnNum").innerHTML = `${fmt(ws.kcal)}<small> / ${fmt(TARGET.burn)}kcal</small>`;
  $("wBurnBar").style.width = pct(ws.kcal, TARGET.burn);
  const perMin = 6 * (TARGET.weight || 70) / 60;   // 경사 걷기 기준 1분 소모량
  $("wBurnHint").textContent = left <= 0 ? "오늘 소모 목표 채웠어요"
    : `${fmt(left)}kcal 남았어요 · 경사 걷기 약 ${Math.ceil(left / perMin)}분이면 채워요`;
  const parts = partsOf(day.workout);
  // 부위별로 따로 비교 — 그날 한 부위끼리만 (하체 날 볼륨이랑 팔을 비교하지 않게)
  const partVol = (w, part) => (w?.exercises || []).filter(e => e.part === part && !isCardio(e)).reduce((t, e) => t + (exNums(e)?.vol || 0), 0);
  const cur = keyOf(current);
  const bits = parts.filter(p => p !== "유산소").map(part => {
    const v = partVol(day.workout, part);
    if (!v) return null;
    const prevK = allDayKeys().filter(k => k < cur).reverse().find(k => partVol(dayData(k)?.workout, part) > 0);
    if (!prevK) return `${part} ${fmt(v)}kg 첫 기록`;
    const d = v - partVol(dayData(prevK).workout, part);
    return `${part} ${fmt(v)}kg (${d >= 0 ? "▲" : "▼"}${fmt(Math.abs(d))})`;
  }).filter(Boolean);
  const cmp = bits.length ? bits.join(" · ") : parts.join(" · ");
  $("wHint").textContent = parts.length ? cmp : "아직 기록이 없어요";
  $("wCmpNote").hidden = !bits.length;
}

function weekStart(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()); }
function hasWorkout(k){ const d = dayData(k); return !!(d && partsOf(d.workout).length); }
function weekWorkoutCount(d){ const s = weekStart(d); let c = 0; for (let i = 0; i < 7; i++) if (hasWorkout(keyOf(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i)))) c++; return c; }
$("prevW").onclick = () => { current = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7); openDay(); };
$("nextW").onclick = () => { current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7); openDay(); };
$("wMin").oninput = () => { day.workout.minutes = Math.max(0, Math.round(+$("wMin").value || 0)); onWorkoutEdit(); };
$("wNote").oninput = () => { day.workout.note = $("wNote").value; $("wSaved").textContent = "저장 중…"; scheduleSave(); };

function renderWorkout(full){
  const s = weekStart(current), todayK = keyOf(new Date()), selK = keyOf(current);
  const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
  $("workDate").textContent = longDate(current);
  $("wkTitle").textContent = `${s.getMonth()+1}.${s.getDate()} – ${e.getMonth()+1}.${e.getDate()}`;
  const grid = $("weekGrid"); grid.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i), k = keyOf(d);
    const b = document.createElement("button");
    b.className = "day" + (k === selK ? " sel" : "") + (k === todayK ? " today" : "");
    const num = document.createElement("span"); num.className = "d"; num.textContent = d.getDate();
    const dot = document.createElement("i"); dot.className = "dot" + (hasWorkout(k) ? " work" : "");
    b.append(num, dot);
    b.setAttribute("aria-label", `${d.getMonth()+1}월 ${d.getDate()}일` + (hasWorkout(k) ? ", 운동함" : ""));
    b.onclick = () => { current = d; openDay(); };
    grid.appendChild(b);
  }
  $("logTitle").textContent = selK === todayK ? "오늘 한 운동" : `${current.getMonth()+1}월 ${current.getDate()}일에 한 운동`;
  renderWorkoutSummary();
  // 입력 중이면 목록을 다시 그리지 않음 (커서 유지)
  const typing = $("wLog").contains(document.activeElement);
  if (full || !typing) { renderLog(); renderExList(); }
  renderRoutines();
  renderNext();
  if (document.activeElement !== $("wMin")) $("wMin").value = day.workout.minutes || "";
  if (document.activeElement !== $("wNote")) $("wNote").value = day.workout.note || "";

  const y = current.getFullYear(), m = current.getMonth(), n = new Date(y, m + 1, 0).getDate();
  const counts = Object.fromEntries(PARTS.map(p => [p, 0])), vols = Object.fromEntries(PARTS.map(p => [p, 0])); let days = 0, totalVol = 0;
  for (let d = 1; d <= n; d++) {
    const w = dayData(`${y}-${pad(m+1)}-${pad(d)}`)?.workout;
    const parts = partsOf(w);
    if (parts.length) { days++; parts.forEach(p => counts[p]++); }
    for (const e of w?.exercises || []) { const v = exNums(e)?.vol || 0; if (e.part in vols) vols[e.part] += v; totalVol += v; }
    if (w?.summary?.volume && !(w.exercises || []).some(e => (e.sets || []).length)) totalVol += w.summary.volume;
  }
  const top = PARTS.filter(p => counts[p]).sort((a, b) => counts[b] - counts[a]);
  const missing = ["가슴", "등", "어깨", "하체"].filter(p => !counts[p]);
  $("monthSum").textContent = days ? `${days}일 · 총 ${fmt(totalVol)}kg${missing.length ? ` · ${missing.join("·")} 아직 안 했어요` : ""}` : "아직 운동 기록이 없어요";
  $("wMonthTitle").textContent = `${m+1}월 부위별 운동`;
  $("wMonthCount").textContent = `${days}일`;
  const max = Math.max(1, ...Object.values(counts));
  $("partBars").innerHTML = "";
  for (const p of PARTS) {
    const r = document.createElement("div"); r.className = "part-bar";
    const a = document.createElement("span"); a.textContent = p;
    const bar = document.createElement("div"); bar.className = "bar"; const i = document.createElement("i"); i.style.width = (counts[p] / max * 100) + "%"; i.style.background = "var(--accent)"; bar.appendChild(i);
    const c = document.createElement("b"); c.textContent = counts[p];
    const v = document.createElement("small"); v.className = "pv"; v.textContent = vols[p] ? `${fmt(vols[p])}kg` : "";
    r.append(a, bar, c, v); $("partBars").appendChild(r);
  }
}

// ---------- 옮겨온 운동 기록 넣기 (한 번만) ----------
async function applyImports(){
  profile.imports = profile.imports || [];
  const col = userCol();
  let added = 0;
  for (const imp of IMPORTS) {
    if (profile.imports.includes(imp.id)) continue;
    for (const [k, w] of Object.entries(imp.days)) {
      const src = cache[k] || loadLocal(k);
      const base = src ? cleanDay(src) : emptyDay();
      if (partsOf(base.workout).length && !base.workout.summary) continue;
      base.workout = { ...emptyWorkout(), ...JSON.parse(JSON.stringify(w)) };
      saveLocal(k, base);
      if (col) { try { await col.doc(k).set({ ...base, date: k, totals: totalsOf(base), updatedAt: Date.now() }); } catch (e) {} }
      else cache[k] = base;
      if (k === keyOf(current) && !dirty) day = cleanDay(base);
      added++;
    }
    profile.imports.push(imp.id);
  }
  for (const imp of MEAL_IMPORTS) {
    if (profile.imports.includes(imp.id)) continue;
    const k = imp.date, isCur = k === keyOf(current);
    const base = isCur ? day : (cache[k] || loadLocal(k) ? cleanDay(cache[k] || loadLocal(k)) : emptyDay());
    for (const id of imp.uncheck || []) base.checks[id] = false;
    const fresh = imp.items.filter(it => !(it.pid && base.checks[it.pid]) && !base.extras.some(x => x.meal === it.meal && (x.name === it.name || (it.pid && x.pid === it.pid))));
    base.extras.push(...JSON.parse(JSON.stringify(fresh)));
    if (isCur) { scheduleSave(); render(); }
    else {
      saveLocal(k, base);
      if (col) { try { await col.doc(k).set({ ...base, date: k, totals: totalsOf(base), updatedAt: Date.now() }); } catch (e) {} }
      else cache[k] = base;
    }
    profile.imports.push(imp.id); added++;
  }
  for (const fx of MEAL_FIXES) {
    if (profile.imports.includes(fx.id)) continue;
    const k = fx.date, isCur = k === keyOf(current);
    const src = isCur ? day : (cache[k] || loadLocal(k));
    if (src) {
      const base = isCur ? day : cleanDay(src);
      let n = 0;
      for (const x of base.extras) if (x.name === fx.match) { Object.assign(x, fx.set); n++; }
      if (n) {
        if (isCur) { scheduleSave(); render(); }
        else { saveLocal(k, base); if (col) { try { await col.doc(k).set({ ...base, date: k, totals: totalsOf(base), updatedAt: Date.now() }); } catch (e) {} } else cache[k] = base; }
      }
    }
    profile.imports.push(fx.id); added++;
  }
  for (const mv of MEAL_MOVES) {
    if (profile.imports.includes(mv.id)) continue;
    const k = mv.date, isCur = k === keyOf(current);
    const src = isCur ? day : (cache[k] || loadLocal(k));
    if (src) {
      const base = isCur ? day : cleanDay(src);
      let n = 0;
      for (const x of base.extras) if (x.meal === mv.from && String(x.name).includes(mv.match)) { x.meal = mv.to; n++; }
      if (n) {
        if (isCur) { scheduleSave(); render(); }
        else { saveLocal(k, base); if (col) { try { await col.doc(k).set({ ...base, date: k, totals: totalsOf(base), updatedAt: Date.now() }); } catch (e) {} } else cache[k] = base; }
      }
    }
    profile.imports.push(mv.id); added++;
  }
  if (added || profile.imports.length) saveProfile();
}

// ---------- 처음 설정 (설문) ----------
const ICON = {
  muscle: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>',
  diet: '<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 9 7 12 3z"/><path d="M12 13v5"/></svg>',
  keep: '<svg viewBox="0 0 24 24"><path d="M4 12h16M7 8l-3 4 3 4M17 8l3 4-3 4"/></svg>',
};
let onb = null;
function needsOnboarding(){ return !profile.nickname; }
function openOnboarding(){
  const last = latestBody(profile);
  onb = { step: 0, nickname: profile.nickname || window.__kakaoName || "", height: profile.height && profile.nickname ? profile.height : (last ? profile.height : ""), weight: last?.weight || "",
    goal: profile.nickname ? profile.goal : (last ? (profile.goal === "bulk" ? "bulk" : "cut") : ""), sex: profile.sex || "m", age: profile.nickname || last ? (profile.age || "") : "" };
  $("onb").hidden = false; document.body.style.overflow = "hidden";
  drawOnb();
}
function closeOnboarding(){ $("onb").hidden = true; document.body.style.overflow = ""; onb = null; }
const ONB_STEPS = ["name", "height", "weight", "goal", "detail", "done"];
function drawOnb(){
  const st = ONB_STEPS[onb.step], total = ONB_STEPS.length - 1;
  $("onbBar").style.width = Math.round(Math.min(onb.step, total) / total * 100) + "%";
  $("onbStep").textContent = onb.step < total ? `${onb.step + 1}/${total}` : "";
  $("onbBack").disabled = onb.step === 0;
  $("onbSkip").hidden = st !== "detail";
  const f = $("onbField"); f.innerHTML = "";
  const next = $("onbNext");
  const err = document.createElement("p"); err.className = "onb-err"; err.id = "onbErr"; err.setAttribute("aria-live", "polite");
  const numInput = (key, unit, ph, mode, cls) => {
    const w = document.createElement("label"); w.className = "onb-input";
    const i = document.createElement("input"); i.id = "onb-" + key; i.value = onb[key] ?? ""; i.placeholder = ph; i.inputMode = mode || "decimal"; if (cls) i.className = cls;
    if (!cls) i.type = "number"; i.autocomplete = "off"; i.enterKeyHint = "next";
    i.oninput = () => { onb[key] = cls ? i.value : i.value; validate(); };
    i.onkeydown = e => { if (e.key === "Enter" && !next.disabled) next.click(); };
    const u = document.createElement("span"); u.textContent = unit;
    w.append(i); if (unit) w.append(u); f.append(w); setTimeout(() => i.focus(), 80);
  };
  const opt = (val, key, title, sub, icon, small) => {
    const b = document.createElement("button"); b.className = "opt" + (small ? " small" : ""); b.setAttribute("aria-pressed", onb[key] === val);
    b.innerHTML = (icon ? `<span class="em">${ICON[icon]}</span>` : "") + `<span><b></b><small></small></span>`;
    b.querySelector("b").textContent = title; const sm = b.querySelector("small"); if (sub) sm.textContent = sub; else sm.remove();
    b.onclick = () => { onb[key] = val; drawOnb(); };
    return b;
  };
  let validate = () => { next.disabled = false; };
  const setText = (eye, q, sub) => { $("onbEye").textContent = eye; $("onbQ").textContent = q; $("onbSub").textContent = sub || ""; };
  next.textContent = "다음";
  if (st === "name") {
    setText("식단 노트에 오신 걸 환영해요", "뭐라고 불러드릴까요?", "닉네임은 홈 화면에 보여요");
    numInput("nickname", "", "닉네임", "text", "txt");
    validate = () => { const v = (onb.nickname || "").trim(); next.disabled = !v || v.length > 12; err.textContent = v.length > 12 ? "12자 이내로 적어주세요" : ""; };
  } else if (st === "height") {
    setText(`${onb.nickname.trim()}님, 반가워요`, "키가 몇 cm예요?");
    numInput("height", "cm", "170");
    validate = () => { const v = +onb.height; next.disabled = !(v >= 120 && v <= 230); err.textContent = onb.height && next.disabled ? "120~230cm 사이로 적어주세요" : ""; };
  } else if (st === "weight") {
    setText("거의 다 왔어요", "지금 몸무게는요?", "하루 칼로리랑 단백질 목표를 정하는 데 써요");
    numInput("weight", "kg", "70");
    validate = () => { const v = +onb.weight; next.disabled = !(v >= 30 && v <= 250); err.textContent = onb.weight && next.disabled ? "30~250kg 사이로 적어주세요" : ""; };
  } else if (st === "goal") {
    setText("목표 고르기", "어떤 몸을 만들고 싶어요?", "나중에 홈에서 언제든 바꿀 수 있어요");
    f.append(opt("bulk", "goal", "근성장", "근육을 키우고 싶어요 · 하루 +300kcal", "muscle"),
             opt("cut", "goal", "다이어트", "체지방을 빼고 싶어요 · 하루 −500kcal", "diet"),
             opt("keep", "goal", "지금 몸 유지", "체중은 그대로, 몸만 단단하게", "keep", true));
    validate = () => { next.disabled = !onb.goal; };
  } else if (st === "detail") {
    setText("선택", "성별이랑 나이도 알려줄래요?", "알려주면 기초대사량을 더 정확하게 계산해요");
    const row = document.createElement("div"); row.className = "onb-row";
    row.append(opt("m", "sex", "남성", "", null, true), opt("f", "sex", "여성", "", null, true)); f.append(row);
    numInput("age", "세", "30", "numeric");
    validate = () => { const v = onb.age; next.disabled = !!v && !(+v >= 10 && +v <= 100); err.textContent = v && next.disabled ? "10~100세 사이로 적어주세요" : ""; };
  } else {
    const p = draftProfile(), T = computeTargets(p);
    setText("설정 끝!", `${onb.nickname.trim()}님의 하루 목표예요`, `${GOALS[onb.goal]} 기준 · 키 ${onb.height}cm · ${onb.weight}kg`);
    const r = document.createElement("div"); r.className = "onb-res";
    const cell = (label, v, unit, wide) => { const d = document.createElement("div"); if (wide) d.className = "wide"; d.innerHTML = `<span></span><b class="num"></b>`; d.querySelector("span").textContent = label; d.querySelector("b").innerHTML = `${v}<small>${unit}</small>`; return d; };
    r.append(cell("칼로리", fmt(T.kcal), "kcal", true), cell("단백질", T.protein, "g"), cell("물", (T.water / 1000).toFixed(1), "L"), cell("탄수화물", T.carb, "g"), cell("운동 소모", fmt(T.burn), "kcal"));
    f.append(r);
    next.textContent = "시작하기";
  }
  if (st !== "goal" && st !== "done") f.append(err);
  validate();
}
function draftProfile(){
  const p = JSON.parse(JSON.stringify(profile));
  p.nickname = onb.nickname.trim(); p.height = +onb.height; p.goal = onb.goal; p.sex = onb.sex; if (onb.age) p.age = +onb.age;
  const w = Math.round(+onb.weight * 10) / 10, today = keyOf(new Date()), last = latestBody(p);
  if (!last || last.weight !== w) p.body = (p.body || []).filter(e => e.date !== today).concat({ date: today, weight: w }).sort((a, c) => a.date.localeCompare(c.date));
  return p;
}
$("onbNext").onclick = () => {
  if (ONB_STEPS[onb.step] === "done") { profile = draftProfile(); saveProfile(); closeOnboarding(); showTab("home"); toast(`${profile.nickname}님, 시작해볼까요!`); setTimeout(() => { if (typeof maybeAskPush === "function") maybeAskPush(); }, 900); return; }
  onb.step++; drawOnb();
};
$("onbSkip").onclick = () => { onb.age = ""; onb.step++; drawOnb(); };
$("onbBack").onclick = () => { if (onb.step > 0) { onb.step--; drawOnb(); } };
$("redoOnb").onclick = () => { closeSettings(); openOnboarding(); };
let onbChecked = false;
function checkOnboarding(){ if (onbChecked) return; onbChecked = true; if (needsOnboarding()) openOnboarding(); }

// ---------- 전체 ----------
function render(full){ renderMeal(); renderHome(); renderWorkout(full); if (typeof renderNotify === "function") renderNotify(); }

// ================= 웹앱: 로그인 · 저장 · AI · 알림 =================
const CFG = { ...(window.DIET_CONFIG || {}) };
// 대시보드에서 주소를 복사할 때 뒤에 /rest/v1/ 이 붙어 와도 괜찮게
if (CFG.SUPABASE_URL) CFG.SUPABASE_URL = CFG.SUPABASE_URL.trim().replace(/\/(rest|auth)\/v1\/?$/, "").replace(/\/+$/, "");
const HAS_SERVER = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
const sbc = HAS_SERVER ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { flowType: "implicit", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
let session = null;

function aiOffMsg(){ return !HAS_SERVER ? "AI 계산은 서버 설정이 끝나면 쓸 수 있어요" : !session ? "로그인하면 AI 계산을 쓸 수 있어요" : !CFG.WORKER_URL ? "AI 서버 주소가 아직 설정되지 않았어요" : "AI 계산을 쓸 수 없어요"; }
function aiErrMsg(e, fallback){ return e && e.code === "rate_limited" ? "오늘 AI 사용 한도를 다 썼어요. 내일 다시 써주세요" : e && e.code === "not_signed_in" ? "다시 로그인해 주세요" : fallback; }

// 사진은 긴 변 1280px JPEG로 줄여서 보내요 (빠르고 저렴하게)
function shrinkImage(file){
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1280, r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지를 읽지 못했어요")); };
    img.src = url;
  });
}
async function callAI(path, prompt, images){
  const body = { prompt };
  if (images && images[0]) body.image = await shrinkImage(images[0]);
  const res = await fetch(CFG.WORKER_URL.replace(/\/$/, "") + path, {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + session.access_token }, body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw { code: out.code || "unavailable", message: out.message };
  return out;
}
function makeSample(){
  const fn = async (prompt, opts = {}) => { const r = await callAI("/ai/text", prompt, opts.images); if (opts.onText) opts.onText({ text: r.text, delta: r.text }); return { text: r.text, truncated: false }; };
  fn.json = async (prompt, opts = {}) => callAI("/ai/json", prompt, opts.images);
  return fn;
}
// 저장소: 기존 화면 코드가 쓰던 모양(collection/doc/set/onSnapshot) 그대로 Supabase에 연결
function makeDb(){
  const listeners = [];
  const load = async () => {
    const { data, error } = await sbc.from("docs").select("id,data").eq("user_id", uid);
    if (error) throw error;
    const snap = { docs: data.map(r => ({ id: r.id, exists: true, data: () => r.data })), metadata: { hasPendingWrites: false, fromCache: false } };
    listeners.forEach(f => f(snap));
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !dirty && !saving) load().catch(() => {}); });
  const col = {
    doc: id => ({ set: async data => {
      const { error } = await sbc.from("docs").upsert({ user_id: uid, id, data, updated_at: new Date().toISOString() });
      if (error) throw error;
    } }),
    onSnapshot(next, onErr){ listeners.push(next); load().catch(e => { onErr && onErr(e); $("saveStatus").textContent = "불러오지 못했어요. 연결을 확인해 주세요"; }); return () => {}; },
  };
  return { collection: () => col };
}
function attachStore(){
  userCol().onSnapshot(snap => {
    const next = {};
    snap.docs.forEach(d => {
      if (!d.exists) return;
      if (d.id === "profile") {
        if (!profileDirty) {
          const p = d.data();
          if (p) { profile = { ...DEFAULT_PROFILE, ...JSON.parse(JSON.stringify(p)) }; saveLocal("profile", profile); TARGET = computeTargets(profile); }
        }
      } else if (isDayKey(d.id)) next[d.id] = d.data();
    });
    cache = next;
    const k = keyOf(current);
    if (!saving && !dirty && cache[k]) day = cleanDay(cache[k]);
    render(!$("wLog").contains(document.activeElement));
    afterLoad();
  });
}
let loadedOnce = false;
function showApp(){ document.documentElement.classList.remove("pre"); }
function afterLoad(){
  if (loadedOnce) return; loadedOnce = true;
  showApp();
  $("boot").hidden = true;
  if (!profile.nickname && session) {
    const m = session.user.user_metadata || {};
    profile.nickname = ""; window.__kakaoName = (m.name || m.nickname || m.full_name || m.preferred_username || "").slice(0, 12);
  }
  checkOnboarding();
  if (!needsOnboarding()) maybeAskPush();
}

// ---------- 첫 화면: 홈 화면에 추가 ----------
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const UA = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(UA);
const inAppBrowser = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\//i.test(UA);
const isMobile = isIOS || isAndroid;
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; drawGate(); });
window.addEventListener("appinstalled", () => { $("gateMsg").textContent = "설치됐어요! 홈 화면의 식단 노트 아이콘을 눌러 열어주세요"; });

function drawGate(){
  const steps = $("gateSteps"); steps.innerHTML = "";
  const add = (n, html) => { const li = document.createElement("li"); li.innerHTML = `<span class="gs-n">${n}</span><span>${html}</span>`; steps.appendChild(li); };
  $("gateInstall").hidden = true;
  if (inAppBrowser) {
    $("gateLead").textContent = "지금은 카카오톡 같은 앱 안에서 열려 있어요. 홈 화면에 추가하려면 기본 브라우저로 열어야 해요";
    add(1, isIOS ? "오른쪽 아래 <b>⋯</b> 또는 공유 버튼을 눌러요" : "오른쪽 위 <b>⋮</b> 메뉴를 눌러요");
    add(2, isIOS ? "<b>Safari로 열기</b>를 골라요" : "<b>다른 브라우저로 열기</b> → <b>Chrome</b>을 골라요");
    add(3, "열린 화면에서 이 안내를 다시 따라오면 돼요");
  } else if (isIOS) {
    $("gateLead").textContent = "홈 화면에 추가하면 앱처럼 쓰고 알림도 받을 수 있어요";
    add(1, `아래 가운데 <b>공유 버튼</b> <svg class="gs-i" viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9"/></svg> 을 눌러요`);
    add(2, "목록을 올려서 <b>홈 화면에 추가</b>를 눌러요");
    add(3, "오른쪽 위 <b>추가</b>를 누르면 끝");
    add(4, "홈 화면에 생긴 <b>식단 노트</b> 아이콘으로 들어와요");
  } else if (isAndroid) {
    $("gateLead").textContent = "홈 화면에 추가하면 앱처럼 쓰고 알림도 받을 수 있어요";
    if (installEvt) $("gateInstall").hidden = false;
    add(1, installEvt ? "아래 <b>홈 화면에 추가</b> 버튼을 누르거나," : "오른쪽 위 <b>⋮</b> 메뉴를 눌러요");
    add(2, installEvt ? "오른쪽 위 <b>⋮</b> → <b>홈 화면에 추가</b> (또는 <b>앱 설치</b>)" : "<b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 눌러요");
    add(3, "홈 화면에 생긴 <b>식단 노트</b> 아이콘으로 들어와요");
  } else {
    $("gateLead").textContent = "식단 노트는 폰에서 쓰도록 만들었어요. 폰으로 이 주소를 열어서 홈 화면에 추가해 주세요";
    add(1, `폰에서 <b class="sel">${location.href.split("#")[0].split("?")[0]}</b> 열기`);
    add(2, "안내대로 홈 화면에 추가");
  }
  $("gateBrowser").hidden = isMobile && !inAppBrowser ? false : false;
}
$("gateInstall").onclick = async () => { if (!installEvt) return; installEvt.prompt(); const r = await installEvt.userChoice; installEvt = null; if (r.outcome === "accepted") $("gateMsg").textContent = "설치하고 있어요. 홈 화면의 아이콘으로 들어와 주세요"; drawGate(); };
$("gateBrowser").onclick = () => { try { localStorage.setItem("meal-note:skipGate", "1"); } catch {} $("gate").hidden = true; startApp(); };

// ---------- 로그인 ----------
const PROVIDER_NAME = { kakao: "카카오", google: "Google" };
async function oauthLogin(provider, scopes){
  $("loginMsg").textContent = `${PROVIDER_NAME[provider] || ""}로 이동하는 중이에요…`;
  const options = { redirectTo: location.origin + location.pathname };
  if (scopes) options.scopes = scopes;
  const { error } = await sbc.auth.signInWithOAuth({ provider, options });
  if (error) $("loginMsg").textContent = "로그인을 시작하지 못했어요: " + error.message;
}
$("kakaoBtn").onclick = () => oauthLogin("kakao", "profile_nickname profile_image");
$("googleBtn").onclick = () => oauthLogin("google");
// Supabase에서 켠 로그인만 버튼 보여주기
async function showEnabledLogins(){
  try {
    const r = await fetch(CFG.SUPABASE_URL + "/auth/v1/settings", { headers: { apikey: CFG.SUPABASE_ANON_KEY } });
    const ext = (await r.json()).external || {};
    $("googleBtn").hidden = !ext.google;
  } catch {}
}
$("localBtn").onclick = () => { try { localStorage.setItem("meal-note:local", "1"); } catch {} $("login").hidden = true; runLocal(); };

function runLocal(){
  showApp();
  db = null; sample = null;
  $("saveStatus").textContent = "이 기기에만 저장돼요 · 로그인하면 다른 폰에서도 이어서 써요";
  $("boot").hidden = true; openDay(); render(true);
  loadedOnce = true; checkOnboarding();
}
function authErrorFromUrl(){
  const p = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
  const e = p.get("error_description") || p.get("error");
  return e ? decodeURIComponent(e.replace(/\+/g, " ")) : "";
}
let authListening = false;
async function startApp(){
  $("boot").hidden = false;
  openDay();
  if (!HAS_SERVER) { showTab(location.hash.slice(1) || "home"); runLocal(); return; }
  const authErr = authErrorFromUrl();
  const { data } = await sbc.auth.getSession();   // 주소에 붙어 온 로그인 정보는 여기서 읽혀요
  session = data.session;
  if (!authListening) {
    authListening = true;
    sbc.auth.onAuthStateChange((ev, s) => {
      session = s;
      if (ev === "SIGNED_IN" && s && !uid) startApp();   // 로그인이 조금 늦게 끝나도 이어서 시작
    });
  }
  if (isAuthHash()) { try { history.replaceState(null, "", location.pathname + location.search); } catch {} }
  showTab(location.hash.slice(1) || "home");
  if (!session) {
    let local = false; try { local = localStorage.getItem("meal-note:local") === "1"; } catch {}
    if (local && !authErr) { runLocal(); return; }
    $("boot").hidden = true; $("login").hidden = false; showEnabledLogins();
    if (authErr) $("loginMsg").textContent = "로그인하지 못했어요: " + authErr;
    return;
  }
  if (uid === session.user.id) return;
  uid = session.user.id;
  $("login").hidden = true;
  db = makeDb();
  sample = CFG.WORKER_URL ? makeSample() : null;
  const via = PROVIDER_NAME[session.user.app_metadata?.provider] || "";
  const who = session.user.user_metadata?.name || session.user.user_metadata?.nickname || session.user.user_metadata?.full_name || "";
  $("acctName").textContent = `${via ? via + " 계정" : "계정"}${who ? " · " + who : ""}으로 로그인됨`;
  $("logoutBtn").hidden = false;
  attachStore();
}

// ---------- 알림 ----------
const PUSH_OK = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
function b64uToBytes(s){ const p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); }
function defaultPrefs(){ return { water: true, meals: true, lunchTime: "12:30", dinnerTime: "21:30", workout: { on: true, time: "19:00", days: [1, 2, 3, 4, 5] } }; }
function getPrefs(){ return { ...defaultPrefs(), ...(profile.notify || {}) }; }
async function currentSub(){ if (!PUSH_OK) return null; const reg = await navigator.serviceWorker.getRegistration(); return reg ? reg.pushManager.getSubscription() : null; }
async function enablePush(){
  if (!PUSH_OK) throw new Error(isIOS && !isStandalone() ? "아이폰은 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요" : "이 브라우저는 알림을 지원하지 않아요");
  if (!session) throw new Error("로그인하면 알림을 켤 수 있어요");
  if (!CFG.VAPID_PUBLIC_KEY) throw new Error("알림 서버 설정이 아직 안 됐어요");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("알림이 꺼져 있어요. 설정 → 알림에서 식단 노트를 켜주세요");
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(CFG.VAPID_PUBLIC_KEY) });
  await savePushPrefs(sub);
  return sub;
}
async function savePushPrefs(sub){
  sub = sub || await currentSub(); if (!sub || !session) return;
  const j = sub.toJSON();
  const { error } = await sbc.from("push_subs").upsert({ endpoint: j.endpoint, user_id: uid, p256dh: j.keys.p256dh, auth: j.keys.auth, prefs: getPrefs(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul" });
  if (error) throw error;
}
async function renderNotify(){
  const st = $("ntStatus"), on = !!(await currentSub().catch(() => null)) && Notification.permission === "granted";
  const P = getPrefs();
  $("ntWater").checked = P.water; $("ntMeals").checked = P.meals; $("ntWork").checked = P.workout.on;
  if (document.activeElement !== $("ntTime")) $("ntTime").value = P.workout.time;
  document.querySelectorAll("#ntDays input").forEach(i => { i.checked = P.workout.days.includes(+i.value); });
  $("ntOn").hidden = on; $("ntTest").hidden = !on;
  $("ntSum").textContent = on ? "켜짐" : "꺼짐";
  st.textContent = !PUSH_OK ? (isIOS && !isStandalone() ? "아이폰은 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요" : "이 브라우저는 알림을 지원하지 않아요")
    : !session ? "로그인하면 알림을 켤 수 있어요" : on ? "이 폰으로 알림이 와요" : "알림 켜기를 누르면 이 폰으로 알려드려요";
}
function prefsFromForm(){
  return { ...getPrefs(), water: $("ntWater").checked, meals: $("ntMeals").checked,
    workout: { on: $("ntWork").checked, time: $("ntTime").value || "19:00", days: [...document.querySelectorAll("#ntDays input:checked")].map(i => +i.value) } };
}
let ntTimer = 0;
function onPrefChange(){
  profile.notify = prefsFromForm(); saveProfile();
  clearTimeout(ntTimer); ntTimer = setTimeout(() => savePushPrefs().then(() => toast("알림 설정을 저장했어요")).catch(() => {}), 500);
}
["ntWater", "ntMeals", "ntWork", "ntTime"].forEach(id => $(id).addEventListener("change", onPrefChange));
$("ntDays").addEventListener("change", onPrefChange);
$("ntOn").onclick = async () => { try { profile.notify = prefsFromForm(); saveProfile(); await enablePush(); toast("알림을 켰어요"); } catch (e) { toast(e.message || "알림을 켜지 못했어요"); } renderNotify(); };
$("ntTest").onclick = async () => {
  try { const r = await fetch(CFG.WORKER_URL.replace(/\/$/, "") + "/push/test", { method: "POST", headers: { authorization: "Bearer " + session.access_token } }); const o = await r.json(); toast(o.sent ? "테스트 알림을 보냈어요" : "보낼 기기를 찾지 못했어요"); }
  catch { toast("테스트 알림을 보내지 못했어요"); }
};
// 설문 끝나고 한 번 물어보기
function maybeAskPush(){
  let asked = false; try { asked = localStorage.getItem("meal-note:askedPush") === "1"; } catch {}
  if (asked || !session || !PUSH_OK || Notification.permission !== "default") return;
  try { localStorage.setItem("meal-note:askedPush", "1"); } catch {}
  const { sh, close } = makeSheet("알림 받을까요?");
  const p = document.createElement("p"); p.className = "status";
  p.textContent = "물 마실 시간, 점심·저녁 기록, 운동 갈 시간을 알려드려요. 기록을 이미 했으면 알림이 안 와요";
  const ok = document.createElement("button"); ok.className = "btn primary"; ok.textContent = "알림 켜기";
  ok.onclick = async () => { try { await enablePush(); toast("알림을 켰어요 · 설정에서 시간을 바꿀 수 있어요"); } catch (e) { toast(e.message); } close(); renderNotify(); };
  const no = document.createElement("button"); no.className = "btn"; no.textContent = "나중에"; no.onclick = close;
  sh.append(p, ok, no);
}

// ---------- 계정 · 백업 ----------
$("logoutBtn").onclick = async () => { await sbc.auth.signOut(); try { localStorage.removeItem("meal-note:local"); } catch {} location.reload(); };
$("exportBtn").onclick = () => {
  const docs = [{ id: "profile", data: profile }, ...allDayKeys().map(k => ({ id: k, data: dayData(k) })).filter(d => d.data)];
  const blob = new Blob([JSON.stringify({ app: "diet-note", exported: new Date().toISOString(), docs }, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `식단노트-백업-${keyOf(new Date())}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
$("importFile").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const j = JSON.parse(await f.text()); const docs = j.docs || [];
    if (!docs.length) throw new Error("기록이 없는 파일이에요");
    for (const d of docs) {
      if (d.id === "profile") { profile = { ...DEFAULT_PROFILE, ...profile, ...d.data, nickname: profile.nickname || d.data.nickname }; await saveProfile(); }
      else if (isDayKey(d.id)) { const c = cleanDay(d.data); saveLocal(d.id, c); cache[d.id] = { ...c, totals: totalsOf(c) }; if (userCol()) await userCol().doc(d.id).set({ ...c, date: d.id, totals: totalsOf(c), updatedAt: Date.now() }); }
    }
    current = new Date(); openDay(); toast(`기록 ${docs.length}개를 가져왔어요`);
  } catch (err) { toast("가져오지 못했어요: " + (err.message || err)); }
};


// ---------- 테마 (기본 라이트 · 오른쪽 위 버튼으로 다크) ----------
function applyTheme(t){
  t = t === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("meal-note:theme", t); } catch {}
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || (t === "dark" ? "#101113" : "#ffffff");
  $("themeColor").setAttribute("content", bg);
  $("themeBtn").setAttribute("aria-label", t === "dark" ? "라이트 모드로 보기" : "다크 모드로 보기");
  $("darkSw").checked = t === "dark";
}
applyTheme(document.documentElement.dataset.theme);
$("themeBtn").onclick = () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
$("darkSw").onchange = () => applyTheme($("darkSw").checked ? "dark" : "light");

// ---------- 설정 화면 ----------
function openSettings(){
  $("pName").value = profile.nickname || "";
  $("pStatus").textContent = "";
  $("setGoal").textContent = GOALS[profile.goal] || "";
  $("settings").hidden = false; $("settings").scrollTop = 0; document.body.style.overflow = "hidden";
  if (typeof renderNotify === "function") renderNotify();
}
function closeSettings(){ $("settings").hidden = true; document.body.style.overflow = ""; }
$("settingsBtn").onclick = openSettings;
$("setClose").onclick = closeSettings;
document.querySelectorAll("[data-open-settings]").forEach(b => b.onclick = openSettings);
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("settings").hidden) closeSettings(); });

// ---------- 시작 ----------
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
(function boot(){
  let skip = false; try { skip = localStorage.getItem("meal-note:skipGate") === "1"; } catch {}
  if (!isStandalone() && !skip && !/[?&]browser=1/.test(location.search)) { $("boot").hidden = true; $("gate").hidden = false; drawGate(); return; }
  startApp();
})();
