# Plan-Craft Frontend 배포 가이드

## Vercel 배포 (Next.js)

### 1. Vercel 계정 준비
1. https://vercel.com 접속
2. GitHub 계정으로 로그인

### 2. 새 프로젝트 Import
1. "Add New" → "Project" 클릭
2. GitHub 레포지토리 선택 (또는 Import Git Repository)
3. plan-craft-web 폴더 선택

### 3. 프로젝트 설정
- **Framework Preset**: Next.js
- **Root Directory**: `plan-craft-web` (모노레포인 경우)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 4. 환경변수 설정
```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

**중요**: Railway 백엔드 배포 완료 후 URL을 여기에 입력!

### 5. 배포 실행
- "Deploy" 버튼 클릭
- 빌드 로그 확인 (약 2-3분)
- 배포 완료 후 URL 확인: `https://plan-craft-web.vercel.app`

### 6. 커스텀 도메인 (선택사항)
1. Project Settings → Domains
2. 원하는 도메인 추가
3. DNS 설정 (Vercel이 자동 안내)

### 7. Railway 백엔드 CORS 업데이트
백엔드의 환경변수에서 FRONTEND_URL 업데이트:
```
FRONTEND_URL=https://plan-craft-web.vercel.app
```

### 8. 테스트
1. Vercel URL 접속
2. 회원가입 테스트
3. 로그인 테스트
4. 프로젝트 생성 및 문서 생성 테스트

---

## 문제 해결

### API 연결 실패 (CORS 오류)
- Railway 백엔드의 FRONTEND_URL 환경변수 확인
- NEXT_PUBLIC_API_URL이 정확한지 확인
- 백엔드 재배포

### 빌드 실패
- Node.js 버전 확인 (Vercel은 자동으로 최신 LTS 사용)
- package.json dependencies 확인
- Build 로그에서 오류 메시지 확인

### 환경변수가 적용되지 않음
- 환경변수 이름이 `NEXT_PUBLIC_` 접두사로 시작하는지 확인
- 변경 후 재배포 필요
- 브라우저 캐시 삭제

---

## 배포 후 확인 사항

✅ 홈 페이지 정상 로드
✅ 회원가입 기능
✅ 로그인 기능
✅ 프로젝트 생성
✅ 문서 생성 (20-30분 소요)
✅ HTML 다운로드

---

## 자동 배포 설정 (선택사항)

Vercel은 GitHub main 브랜치에 push하면 자동 배포됩니다.

**Production 배포**: main 브랜치
**Preview 배포**: PR 또는 다른 브랜치

---

## 비용

- **Vercel Hobby 플랜**: 무료
  - 월 100GB 대역폭
  - 무제한 배포
  - HTTPS 자동

- **Railway Starter 플랜**: $5/월
  - $5 크레딧
  - 문서 생성당 $5-6이므로 월 1회 정도 가능
  - 프로덕션 사용 시 Usage-based pricing 고려
