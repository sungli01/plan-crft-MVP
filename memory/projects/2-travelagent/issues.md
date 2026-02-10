# Travelagent 문제 해결 이력

## 1. Vercel 빌드 실패 - pages/app 충돌
**발생**: 2026-02-09 13:34
**증상**: `'pages'와 'app' 디렉토리가 동시에 발견됨` 에러
**원인**: Next.js 14 구조 오류 - `page.tsx`가 root에 있음
**해결**: `app/` 디렉토리 생성 → `page.tsx` 이동
**커밋**: 8f2d89e

## 2. Next.js 14 설정 파일 누락
**발생**: 2026-02-09 13:35
**증상**: 빌드 설정 없음
**해결**: 
- `next.config.js` 추가
- `app/layout.tsx` 추가 (필수)
- `tsconfig.json` 추가
**커밋**: 8f2d89e

## 3. 클라이언트 컴포넌트 오류
**발생**: 2026-02-09 13:41
**증상**: useState 사용하지만 'use client' 없음
**원인**: Next.js 14 App Router는 기본 Server Component
**해결**: 
- `app/page.tsx`에 `'use client'` 추가
- `components/TravelAgentWindow.tsx`에 `'use client'` 추가
- import 경로 수정 (`./components` → `../components`)
**커밋**: aa5937c
**상태**: Vercel 재배포 진행 중 (2026-02-09 13:49)

## 교훈
1. Next.js 14는 `app/` 디렉토리 필수
2. `app/layout.tsx` 없으면 빌드 실패
3. useState 사용 → `'use client'` 필수
4. import 경로는 상대 경로 기준 정확히

## 4. TypeScript 패키지 누락
**발생**: 2026-02-09 15:52
**증상**: Vercel 빌드 실패 - "TypeScript required package(s) not installed"
**원인**: package.json에 devDependencies 없음
**해결**: 
- typescript, @types/react, @types/node 추가
- tailwindcss, autoprefixer, postcss 추가
- tailwind.config.js, postcss.config.js 생성
- app/globals.css 생성 + layout.tsx import
**커밋**: cac900d
**상태**: Vercel 재배포 중 (1~2분 후 완료)

## 5. TravelAgentWindow prop 타입 미정의
**발생**: 2026-02-09 17:34
**증상**: Vercel 빌드 실패 - "Property 'onPlanGenerated' does not exist"
**원인**: TravelAgentWindow 컴포넌트가 props 타입 정의 없음
**해결**: 
- interface TravelAgentWindowProps 추가
- onPlanGenerated: (plan: any) => void
**커밋**: b995e12
**상태**: Vercel 재배포 중 (1~2분)
