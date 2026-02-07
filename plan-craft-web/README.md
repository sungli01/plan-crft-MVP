# Plan-Craft Web Frontend

Plan-Craft v3.0 멀티 에이전트 문서 생성 시스템의 프론트엔드 웹 애플리케이션입니다.

## 🚀 Features

- ✅ 사용자 회원가입/로그인
- ✅ 프로젝트 관리 대시보드
- ✅ 문서 생성 요청
- ✅ 실시간 생성 상태 확인
- ✅ HTML 문서 다운로드
- ✅ 반응형 디자인 (모바일/데스크톱)

## 📊 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Deployment**: Vercel

## 🛠️ Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your backend URL

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🌐 Deployment

Vercel 배포 가이드: [DEPLOY.md](./DEPLOY.md)

## 📝 Environment Variables

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## 📁 Project Structure

```
plan-craft-web/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── login/               # Login page
│   ├── register/            # Register page
│   ├── dashboard/           # Dashboard
│   ├── create/              # Project creation
│   └── project/[id]/        # Project detail
├── public/                  # Static assets
├── tailwind.config.ts       # Tailwind config
└── next.config.js          # Next.js config
```

## 🎨 Design

- **Color Scheme**: Blue gradient (신뢰감)
- **Typography**: Malgun Gothic, Apple SD Gothic Neo
- **Layout**: 반응형 그리드 시스템

## 📄 License

MIT
