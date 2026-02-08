# Plan-Craft 사용 설명서

> 🗓️ 작성일: 2026-02-08  
> 📖 대상: 사용자 및 개발자  
> ✍️ 작성자: 바질 (AI 어시스턴트)

---

## 📑 목차

1. [Plan-Craft란?](#1-plan-craft란)
2. [사용자 가이드 (서비스 이용 방법)](#2-사용자-가이드)
3. [개발자 가이드 (배포 방법)](#3-개발자-가이드)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [자주 발생하는 문제 해결](#5-자주-발생하는-문제-해결)

---

## 1. Plan-Craft란?

**Plan-Craft**는 AI가 사업계획서를 자동으로 생성해주는 웹 서비스입니다.

사업 아이디어만 입력하면, 4개의 AI 에이전트가 순차적으로 작업하여 전문적인 사업계획서를 만들어 줍니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| 🤖 **AI 자동 생성** | 사업 아이디어 하나로 25개 섹션의 완성된 사업계획서 생성 |
| 📊 **실시간 진행 추적** | 생성 과정을 실시간으로 확인 가능 |
| 📄 **PDF 내보내기** | 생성된 사업계획서를 PDF로 다운로드 |
| 🌙 **다크모드** | 눈이 편한 다크모드 지원 |
| 🔒 **개인 계정** | 회원가입 후 내 사업계획서를 안전하게 보관 |
| 🔗 **공유 기능** | 링크로 사업계획서 공유 가능 |

### 접속 주소

- **서비스 URL**: https://plan-crft-mvp-ot41.vercel.app
- **API 서버**: https://plan-crft-mvp-production.up.railway.app
- **소스 코드**: https://github.com/sungli01/plan-crft-MVP.git

---

## 2. 사용자 가이드

### 2-1. 회원가입

1. https://plan-crft-mvp-ot41.vercel.app 에 접속합니다.
2. 우측 상단의 **"회원가입"** 버튼을 클릭합니다.
3. 아래 정보를 입력합니다:
   - **이메일**: 사용할 이메일 주소
   - **비밀번호**: 8자 이상의 비밀번호
   - **이름**: 표시될 이름
4. **"가입하기"** 버튼을 클릭합니다.
5. 가입이 완료되면 자동으로 로그인 페이지로 이동합니다.

### 2-2. 로그인

1. 우측 상단의 **"로그인"** 버튼을 클릭합니다.
2. 가입할 때 사용한 **이메일**과 **비밀번호**를 입력합니다.
3. **"로그인"** 버튼을 클릭합니다.
4. 로그인 성공 시 메인 페이지로 이동합니다.

### 2-3. 사업계획서 생성하기

이것이 Plan-Craft의 **핵심 기능**입니다!

#### 단계 1: 생성 페이지로 이동

- 상단 메뉴에서 **"생성"** 또는 **"새 사업계획서"** 버튼을 클릭합니다.

#### 단계 2: 사업 아이디어 입력

- 텍스트 입력창에 **사업 아이디어**를 작성합니다.
- 예시:
  ```
  반려동물 맞춤형 영양제 구독 서비스. 
  반려동물의 나이, 종, 건강 상태에 따라 
  맞춤형 영양제를 매월 배송하는 서비스입니다.
  ```
- **팁**: 아이디어를 자세히 쓸수록 더 좋은 결과가 나옵니다!

#### 단계 3: 생성 시작

- **"사업계획서 생성"** 버튼을 클릭합니다.
- AI가 작업을 시작하며, **실시간 진행 화면**으로 이동합니다.

#### 단계 4: 진행 상태 확인

생성 중에는 아래와 같은 진행 상태를 실시간으로 볼 수 있습니다:

```
① Architect (구조 설계)    ████████████████████ 100% ✅
② Writer (콘텐츠 작성)     ████████████░░░░░░░░  60% ⏳
③ Image Curator (이미지)   ░░░░░░░░░░░░░░░░░░░░   0% ⏸️
④ Reviewer (품질 검토)     ░░░░░░░░░░░░░░░░░░░░   0% ⏸️
```

- 전체 생성에 약 **2~5분**이 소요됩니다.
- 페이지를 닫아도 서버에서 계속 생성됩니다.

#### 단계 5: 결과 확인

- 생성이 완료되면 자동으로 **사업계획서 뷰어**로 이동합니다.
- 25개 섹션으로 구성된 사업계획서를 확인할 수 있습니다.
- 우측 상단에 **품질 점수** (예: 87.6/100)가 표시됩니다.

### 2-4. 내 사업계획서 관리

#### 목록 보기

- 상단 메뉴에서 **"내 계획서"**를 클릭합니다.
- 생성한 모든 사업계획서가 카드 형태로 표시됩니다.
- 각 카드에는 제목, 생성일, 상태, 품질 점수가 표시됩니다.

#### 상세 보기

- 원하는 사업계획서 카드를 클릭하면 상세 내용을 볼 수 있습니다.

#### PDF 다운로드

1. 사업계획서 상세 페이지에서 **"PDF 내보내기"** 버튼을 클릭합니다.
2. PDF 파일이 자동으로 다운로드됩니다.
3. 다운로드된 PDF는 인쇄하거나 이메일로 전송할 수 있습니다.

#### 삭제

- 사업계획서 카드 또는 상세 페이지에서 **"삭제"** 버튼을 클릭합니다.
- 삭제 확인 팝업이 나타나면 **"확인"**을 클릭합니다.
- ⚠️ **주의**: 삭제된 사업계획서는 복구할 수 없습니다!

#### 공유

1. 사업계획서 상세 페이지에서 **"공유"** 버튼을 클릭합니다.
2. 공유 링크가 클립보드에 복사됩니다.
3. 이 링크를 받은 사람은 로그인 없이 사업계획서를 볼 수 있습니다.

### 2-5. 다크모드 사용

- 우측 상단의 🌙 (달) 아이콘을 클릭하면 **다크모드**로 전환됩니다.
- 다시 클릭하면 ☀️ (해) **라이트모드**로 돌아옵니다.
- 설정은 브라우저에 저장되어 다음 방문 시에도 유지됩니다.

---

## 3. 개발자 가이드

### 3-1. 사전 요구사항

아래 프로그램이 컴퓨터에 설치되어 있어야 합니다:

| 프로그램 | 최소 버전 | 설치 방법 |
|----------|----------|-----------|
| **Node.js** | v18 이상 | https://nodejs.org 에서 다운로드 |
| **npm** | v9 이상 | Node.js 설치 시 함께 설치됨 |
| **Git** | 최신 | https://git-scm.com 에서 다운로드 |
| **PostgreSQL** | 15 이상 | https://postgresql.org 에서 다운로드 (로컬 개발 시) |

#### Node.js 설치 확인

터미널(명령 프롬프트)을 열고 다음을 입력합니다:

```bash
node --version
# v18.0.0 이상이 나오면 OK

npm --version  
# v9.0.0 이상이 나오면 OK
```

#### Git 설치 확인

```bash
git --version
# git version 2.x.x 이 나오면 OK
```

### 3-2. 소스 코드 다운로드

```bash
# 1. 원하는 폴더로 이동
cd ~/projects   # 예시

# 2. GitHub에서 소스 코드 다운로드 (클론)
git clone https://github.com/sungli01/plan-crft-MVP.git

# 3. 프로젝트 폴더로 이동
cd plan-crft-MVP
```

### 3-3. 백엔드 설정

```bash
# 1. 백엔드 폴더로 이동
cd backend

# 2. 필요한 패키지 설치 (처음 한 번만)
npm install

# 3. 환경 변수 파일 생성
cp .env.example .env
# .env 파일을 열어서 환경 변수를 설정합니다 (아래 '환경 변수 설정' 참고)

# 4. 데이터베이스 마이그레이션 실행
npm run db:migrate

# 5. 개발 서버 시작
npm run dev
```

성공하면 다음과 같은 메시지가 나타납니다:
```
🚀 Server running on http://localhost:3000
```

### 3-4. 프론트엔드 설정

새 터미널 창을 열고:

```bash
# 1. 프론트엔드 폴더로 이동 (프로젝트 루트에서)
cd frontend

# 2. 필요한 패키지 설치 (처음 한 번만)
npm install

# 3. 환경 변수 파일 생성
cp .env.example .env.local
# .env.local 파일을 열어서 환경 변수를 설정합니다

# 4. 개발 서버 시작
npm run dev
```

성공하면 다음과 같은 메시지가 나타납니다:
```
▲ Next.js 14.x.x
- Local:    http://localhost:3001
```

### 3-5. 로컬에서 확인

1. 브라우저에서 http://localhost:3001 에 접속합니다.
2. 회원가입 → 로그인 → 사업계획서 생성을 테스트합니다.

### 3-6. Railway 배포 (백엔드)

#### 계정 생성

1. https://railway.app 에 접속합니다.
2. **GitHub 계정**으로 가입합니다.

#### 프로젝트 생성

1. Railway 대시보드에서 **"New Project"** 클릭
2. **"Deploy from GitHub Repo"** 선택
3. `sungli01/plan-crft-MVP` 레포지토리 선택
4. **Root Directory**를 `backend`로 설정

#### PostgreSQL 추가

1. 프로젝트 내에서 **"New"** → **"Database"** → **"PostgreSQL"** 클릭
2. PostgreSQL 서비스가 자동으로 생성됩니다.
3. `DATABASE_URL` 환경 변수가 자동으로 연결됩니다.

#### 환경 변수 설정

1. 백엔드 서비스 클릭 → **"Variables"** 탭
2. 아래 환경 변수를 추가합니다 (자세한 내용은 [4. 환경 변수 설정](#4-환경-변수-설정) 참고)

#### 배포 확인

- Railway가 자동으로 빌드하고 배포합니다.
- **"Deployments"** 탭에서 배포 상태를 확인합니다.
- 배포 완료 후 제공된 URL(예: `xxx.up.railway.app`)로 접속하여 확인합니다.

### 3-7. Vercel 배포 (프론트엔드)

#### 계정 생성

1. https://vercel.com 에 접속합니다.
2. **GitHub 계정**으로 가입합니다.

#### 프로젝트 import

1. Vercel 대시보드에서 **"Add New..."** → **"Project"** 클릭
2. `sungli01/plan-crft-MVP` 레포지토리 import
3. **Framework Preset**: `Next.js` 선택
4. **Root Directory**: `frontend` 입력
5. **Environment Variables** 섹션에서 환경 변수 추가

#### 배포

1. **"Deploy"** 버튼을 클릭합니다.
2. Vercel이 자동으로 빌드하고 배포합니다.
3. 배포 완료 후 제공된 URL(예: `xxx.vercel.app`)로 접속하여 확인합니다.

#### 자동 배포 설정

- GitHub에 push하면 **자동으로 재배포**됩니다.
- PR을 올리면 **프리뷰 배포**가 자동 생성됩니다.

---

## 4. 환경 변수 설정

### 백엔드 환경 변수 (.env)

```env
# ========================================
# 데이터베이스
# ========================================
# PostgreSQL 연결 문자열
# Railway 사용 시 자동으로 제공됩니다.
# 로컬 개발 시 아래와 같이 설정합니다.
DATABASE_URL=postgresql://사용자이름:비밀번호@localhost:5432/plancraft

# ========================================
# 인증 (JWT)
# ========================================
# JWT 서명에 사용할 비밀 키 (반드시 복잡한 문자열로 설정!)
# 터미널에서 생성: openssl rand -hex 32
JWT_SECRET=여기에_복잡한_랜덤_문자열_입력

# JWT 토큰 만료 시간 (기본: 7일)
JWT_EXPIRES_IN=7d

# ========================================
# AI (Claude API)
# ========================================
# Anthropic API 키
# https://console.anthropic.com 에서 발급
ANTHROPIC_API_KEY=sk-ant-여기에_API_키_입력

# ========================================
# 서버 설정
# ========================================
# 실행 환경 (development / production)
NODE_ENV=development

# 서버 포트 (Railway에서는 자동 할당)
PORT=3000

# ========================================
# 보안
# ========================================
# CORS 허용 도메인 (프론트엔드 URL)
CORS_ORIGIN=http://localhost:3001

# Rate Limiting 윈도우 (밀리초, 기본: 15분)
RATE_LIMIT_WINDOW=900000

# Rate Limiting 최대 요청 횟수
RATE_LIMIT_MAX=100
```

### 프론트엔드 환경 변수 (.env.local)

```env
# ========================================
# API 서버 주소
# ========================================
# 백엔드 API URL
# 로컬 개발 시: http://localhost:3000
# 프로덕션 시: Railway에서 제공한 URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# ========================================
# 앱 정보
# ========================================
# 앱 이름 (UI에 표시)
NEXT_PUBLIC_APP_NAME=Plan-Craft
```

### 프로덕션 환경 변수 (배포 시)

#### Railway (백엔드)

| 변수명 | 값 (예시) |
|--------|----------|
| `DATABASE_URL` | *(Railway가 자동 제공)* |
| `JWT_SECRET` | `a1b2c3d4e5f6...` (랜덤 문자열) |
| `JWT_EXPIRES_IN` | `7d` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://plan-crft-mvp-ot41.vercel.app` |
| `RATE_LIMIT_WINDOW` | `900000` |
| `RATE_LIMIT_MAX` | `100` |

#### Vercel (프론트엔드)

| 변수명 | 값 (예시) |
|--------|----------|
| `NEXT_PUBLIC_API_URL` | `https://plan-crft-mvp-production.up.railway.app` |
| `NEXT_PUBLIC_APP_NAME` | `Plan-Craft` |

### ⚠️ 환경 변수 주의사항

1. **절대로 `.env` 파일을 GitHub에 올리지 마세요!**
   - `.gitignore`에 `.env`와 `.env.local`이 포함되어 있는지 확인하세요.
2. **`JWT_SECRET`은 반드시 복잡한 문자열로 설정하세요.**
   - 추천: `openssl rand -hex 32` 명령어로 생성
3. **`ANTHROPIC_API_KEY`를 공유하지 마세요.**
   - API 키가 노출되면 즉시 Anthropic 콘솔에서 재발급하세요.

---

## 5. 자주 발생하는 문제 해결

### 🔴 문제 1: `npm install` 실행 시 에러

**증상:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**해결 방법:**
```bash
# 방법 1: --legacy-peer-deps 옵션 추가
npm install --legacy-peer-deps

# 방법 2: node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# 방법 3: Node.js 버전 확인
node --version
# v18 이상이어야 합니다. 아니라면 Node.js를 업데이트하세요.
```

---

### 🔴 문제 2: 백엔드 서버가 시작되지 않음

**증상:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**원인:** PostgreSQL이 실행되지 않고 있습니다.

**해결 방법:**

```bash
# PostgreSQL 실행 상태 확인
# macOS:
brew services list | grep postgresql
brew services start postgresql

# Ubuntu/Linux:
sudo systemctl status postgresql
sudo systemctl start postgresql

# Windows:
# 서비스 관리자에서 PostgreSQL 서비스 시작

# 또는 Docker 사용:
docker run -d \
  --name plancraft-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=plancraft \
  -p 5432:5432 \
  postgres:15
```

---

### 🔴 문제 3: "CORS error" 발생

**증상:**  
브라우저 콘솔에 다음과 같은 에러가 표시됩니다:
```
Access to fetch at 'https://...' from origin 'http://localhost:3001' 
has been blocked by CORS policy
```

**원인:** 백엔드의 CORS 설정이 프론트엔드 URL과 맞지 않습니다.

**해결 방법:**

1. 백엔드 `.env` 파일을 엽니다.
2. `CORS_ORIGIN`을 프론트엔드 주소로 정확히 설정합니다:
   ```env
   # 로컬 개발 시
   CORS_ORIGIN=http://localhost:3001
   
   # 프로덕션
   CORS_ORIGIN=https://plan-crft-mvp-ot41.vercel.app
   ```
3. 백엔드 서버를 재시작합니다.

---

### 🔴 문제 4: 사업계획서 생성이 실패함

**증상:**  
생성 버튼을 눌러도 에러가 발생하거나 진행이 멈춤

**가능한 원인과 해결:**

#### 원인 1: Anthropic API 키가 잘못됨
```bash
# .env 파일에서 API 키 확인
# 키가 sk-ant-로 시작하는지 확인
ANTHROPIC_API_KEY=sk-ant-...
```
- https://console.anthropic.com 에서 API 키 확인
- 키가 만료되었다면 새로 발급

#### 원인 2: API 사용량 초과
- Anthropic 콘솔에서 사용량 및 잔액 확인
- 무료 크레딧이 소진되었다면 결제 정보 등록

#### 원인 3: Rate Limit 초과
- 짧은 시간에 너무 많은 요청을 보냄
- **15분** 후 다시 시도

---

### 🔴 문제 5: Railway 배포 실패

**증상:**  
Railway 대시보드에서 배포가 "Failed" 상태

**해결 방법:**

1. **빌드 로그 확인**: Deployments → 실패한 배포 클릭 → 로그 확인
2. **Root Directory 확인**: Settings에서 Root Directory가 `backend`로 설정되어 있는지 확인
3. **환경 변수 확인**: 필수 환경 변수가 모두 설정되어 있는지 확인
4. **Start Command 확인**: `npm start` 또는 `npm run start`가 `package.json`에 정의되어 있는지 확인

---

### 🔴 문제 6: Vercel 배포 실패

**증상:**  
Vercel 대시보드에서 빌드 에러

**해결 방법:**

1. **빌드 로그 확인**: Vercel 대시보드 → Deployments → 로그 확인
2. **Root Directory 확인**: Settings → General에서 Root Directory가 `frontend`로 설정되어 있는지 확인
3. **Framework 확인**: Framework Preset이 `Next.js`로 설정되어 있는지 확인
4. **환경 변수 확인**: `NEXT_PUBLIC_API_URL`이 올바르게 설정되어 있는지 확인
5. **로컬에서 빌드 테스트**:
   ```bash
   cd frontend
   npm run build
   ```
   - 로컬에서 빌드가 성공하면 Vercel 설정 문제
   - 로컬에서도 실패하면 코드 문제

---

### 🔴 문제 7: 다크모드가 깜빡임 (Flash of Wrong Theme)

**증상:**  
페이지 로딩 시 잠깐 라이트모드로 표시되었다가 다크모드로 전환됨

**해결 방법:**

이것은 SSR(서버 사이드 렌더링)과 클라이언트 테마가 다를 때 발생합니다. `ThemeProvider`에 `suppressHydrationWarning` 속성이 설정되어 있는지 확인하세요:

```tsx
// layout.tsx
<html suppressHydrationWarning>
  <body>
    <ThemeProvider attribute="class" defaultTheme="system">
      {children}
    </ThemeProvider>
  </body>
</html>
```

---

### 🔴 문제 8: Git push 할 수 없음

**증상:**
```
remote: Permission to sungli01/plan-crft-MVP.git denied
```

**해결 방법:**

```bash
# 1. Git 인증 확인
git config --global user.name
git config --global user.email

# 2. 아직 설정하지 않았다면:
git config --global user.name "내이름"
git config --global user.email "내이메일@example.com"

# 3. GitHub 인증 방법 (택 1)

# 방법 A: Personal Access Token (추천)
# GitHub → Settings → Developer Settings → Personal access tokens → Generate new token
# 생성된 토큰을 비밀번호 대신 사용

# 방법 B: SSH 키
# ssh-keygen -t ed25519 -C "내이메일@example.com"
# 생성된 공개키를 GitHub → Settings → SSH Keys에 등록
```

---

### 🔴 문제 9: 페이지가 빈 화면으로 표시됨

**증상:**  
사이트에 접속하면 아무것도 표시되지 않음

**해결 방법:**

1. **브라우저 개발자 도구 확인** (F12 → Console 탭)
   - 빨간 에러 메시지가 있는지 확인
2. **API URL 확인**
   - `NEXT_PUBLIC_API_URL`이 올바른지 확인
   - 백엔드 서버가 실행 중인지 확인
3. **브라우저 캐시 삭제**
   - Ctrl + Shift + Delete → 캐시 삭제
   - 또는 시크릿/프라이빗 모드에서 접속

---

### 🔴 문제 10: 데이터베이스 마이그레이션 에러

**증상:**
```
Error: relation "users" does not exist
```

**해결 방법:**

```bash
# 1. 백엔드 폴더에서 마이그레이션 실행
cd backend
npm run db:migrate

# 2. 마이그레이션이 계속 실패한다면 DB 재생성
npm run db:push

# 3. 그래도 안 된다면 데이터베이스 삭제 후 재생성 (주의: 데이터 손실!)
# 로컬 PostgreSQL:
dropdb plancraft
createdb plancraft
npm run db:migrate
```

---

## 📞 도움이 더 필요하신가요?

- **GitHub Issues**: https://github.com/sungli01/plan-crft-MVP/issues
  - 버그 신고나 기능 요청은 여기에 등록해주세요.
- **소스 코드 확인**: https://github.com/sungli01/plan-crft-MVP.git

---

> 💡 이 문서는 Plan-Craft v3.0의 사용 설명서입니다.  
> 최종 업데이트: 2026-02-08 13:30 KST
