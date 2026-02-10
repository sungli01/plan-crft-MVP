# Travelagent (Skywork Voyage Intelligence) 설정

## 배포 정보
- **Frontend**: (Vercel 배포 진행 중)
- **Backend**: https://traverai-production.up.railway.app
- **GitHub**: https://github.com/sungli01/Traver_AI
- **도메인**: travelagent.co.kr (연동 예정)

## 기술 스택
- **Frontend**: Next.js 14 App Router, Tailwind CSS, Lucide Icons
- **Backend**: Express, @anthropic-ai/sdk
- **AI Model**: Claude 3 Opus

## Railway 환경변수
```json
{
  "ANTHROPIC_API_KEY": "[REDACTED - dedicated key for Travelagent]",
  "PORT": "8080",
  "ALLOWED_ORIGINS": "https://travelagent.co.kr,https://traver-ai.vercel.app"
}
```
- **주의**: 실제 값은 Railway 대시보드에서 확인

## Vercel 환경변수
```json
{
  "NEXT_PUBLIC_API_URL": "https://traverai-production.up.railway.app"
}
```

## 프로젝트 구조
```
apps/
├── client/          # Next.js 14 frontend
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── components/
│       ├── TravelAgentWindow.tsx
│       └── ItineraryTimeline.tsx
└── server/          # Express backend
    └── index.js
```
