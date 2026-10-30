# 식단 노트

식단 · 물 · 운동 기록 웹앱 (홈 화면에 추가해서 앱처럼 쓰는 PWA)

- `web/` — 앱 화면 (GitHub Pages)
- `worker/` — 서버: 사진·글로 칼로리 계산(Claude API), 30분마다 알림 (Cloudflare Worker)
- `supabase/schema.sql` — DB (카카오 로그인 + 기록 저장)

설정 전에도 `web/` 만 올라가면 **'이 폰에만 저장' 모드**로 바로 써볼 수 있어요. 아래를 순서대로 하면 카카오 로그인 · 서버 저장 · AI · 알림이 켜져요. 처음 한 번만 하면 돼요 (30~40분).

> 키(비밀번호 같은 값)는 이 문서에 적힌 곳 **에만** 붙여넣으세요. 채팅이나 코드에 붙여넣지 않아요.

---

## 1. GitHub Pages 켜기

1. 저장소 → **Settings → Pages**
2. **Source** 를 **GitHub Actions** 로 바꾸기
3. **Actions** 탭 → **배포** → **Run workflow**
4. 끝나면 주소가 생겨요: `https://<아이디>.github.io/<저장소이름>/`  ← 이하 **앱 주소**

## 2. Supabase (DB + 로그인)

1. https://supabase.com → **New project** (Region: **Northeast Asia (Seoul)**)
2. 왼쪽 **SQL Editor → New query** → `supabase/schema.sql` 내용 전부 붙여넣고 **Run**
3. **Project Settings → API** 에서 세 값 확인
   - `Project URL` → 나중에 **SUPABASE_URL**
   - `anon public` 키 → **SUPABASE_ANON_KEY**
   - `service_role` 키 → **SUPABASE_SERVICE_KEY** (비밀! Secrets에만)
4. **Authentication → URL Configuration**
   - Site URL: 앱 주소
   - Redirect URLs: 앱 주소 추가

## 3. 카카오 로그인

1. https://developers.kakao.com → **내 애플리케이션 → 애플리케이션 추가하기** (앱 이름: 식단 노트, 아이콘: `web/icons/icon-512.png`)
2. **앱 키** 에서 **REST API 키** 복사
3. **카카오 로그인** → 활성화 **ON**
   - **Redirect URI**: `https://<SUPABASE 프로젝트>.supabase.co/auth/v1/callback`
4. **카카오 로그인 → 동의항목**: 닉네임, 프로필 사진 → **필수 동의** (이메일은 사업자 앱만 돼서 안 씀)
5. **카카오 로그인 → 보안 → Client Secret** → 코드 생성 → 활성화 → 값 복사
6. **플랫폼 → Web** → 사이트 도메인에 `https://<아이디>.github.io` 추가
7. Supabase **Authentication → Sign In / Providers → Kakao** 켜기
   - REST API Key → Client ID, Client Secret 붙여넣기 → Save
8. Supabase **Authentication → Sign In / Providers** 맨 위 **Allow users without an email** 켜기

## 4. 알림 키 (VAPID)

1. 앱 주소 뒤에 `tools/vapid.html` 붙여서 열기 → **키 만들기**
2. 공개 키 → **VAPID_PUBLIC_KEY**, 비공개 키 → **VAPID_PRIVATE_KEY** (비밀! Secrets에만)

## 5. Claude API 키 (사진·글로 칼로리 계산)

1. https://console.anthropic.com → **Billing** 에서 크레딧 충전 ($5면 한참 써요)
2. **API Keys → Create Key** → **ANTHROPIC_API_KEY** (비밀!)
3. 혹시 몰라 **Limits** 에서 월 사용 한도를 걸어두면 좋아요. 앱도 한 사람당 하루 60회로 막아둬요.

## 6. Cloudflare (서버)

1. https://dash.cloudflare.com 가입
2. 오른쪽 **Account ID** 복사 → **CLOUDFLARE_ACCOUNT_ID**
3. **My Profile → API Tokens → Create Token → Edit Cloudflare Workers** 템플릿 → 생성 → **CLOUDFLARE_API_TOKEN** (비밀!)

## 7. GitHub에 값 넣기

저장소 → **Settings → Secrets and variables → Actions**

**Secrets** 탭 (비밀 — 아무도 다시 못 봐요)

| 이름 | 값 |
|---|---|
| `ANTHROPIC_API_KEY` | 5번 |
| `SUPABASE_SERVICE_KEY` | 2번 service_role |
| `VAPID_PRIVATE_KEY` | 4번 비공개 키 |
| `CLOUDFLARE_API_TOKEN` | 6번 |
| `CLOUDFLARE_ACCOUNT_ID` | 6번 |

**Variables** 탭 (공개돼도 괜찮은 값)

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | 2번 Project URL |
| `SUPABASE_ANON_KEY` | 2번 anon public |
| `VAPID_PUBLIC_KEY` | 4번 공개 키 |
| `ALLOWED_ORIGIN` | `https://<아이디>.github.io` |
| `DEPLOY_WORKER` | `true` |

## 8. 배포 두 번

1. **Actions → 배포 → Run workflow** → 끝나면 **서버 (Cloudflare Worker)** 로그 맨 아래에 `https://diet-note-api.<이름>.workers.dev` 주소가 나와요
2. Variables 에 `WORKER_URL` = 그 주소 추가
3. **Run workflow** 한 번 더 → 끝!

폰으로 앱 주소 열기 → 홈 화면에 추가 → 아이콘으로 열기 → 카카오 로그인 → 홈의 **알림** 카드에서 **알림 켜기** → **테스트**

## 기존 기록 옮기기

홈 → **계정 · 백업 → 기록 가져오기** 에서 백업 JSON 파일을 고르면 돼요.

## 알림 규칙

30분마다 확인해서, **기록이 비어 있을 때만** 보내요 (같은 알림은 하루 한 번).

- 물: 10·12·14·16·18·20시, 오늘 마신 양이 목표보다 적으면
- 점심: 12:30, 점심 기록이 없으면
- 저녁: 21:30, 저녁(운동 전후 포함) 기록이 없으면
- 운동: 정한 요일·시간에 오늘 운동 기록이 없으면 (오늘 추천 부위 같이)

아이폰은 iOS 16.4 이상 + 홈 화면에 추가한 앱에서만 알림이 와요.
