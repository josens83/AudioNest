# AudioNest - Premium Audio Content Platform

> 喜马拉雅(Ximalaya)를 벤치마킹한 프리미엄 오디오 콘텐츠 플랫폼

AudioNest는 오디오북, 팟캐스트, 지식 콘텐츠를 제공하며, "무료 청취 → VIP 구독 → 개별 구매" 다층 수익화 모델을 구현합니다.

## Tech Stack

### Frontend
- **Web**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Mobile**: React Native (Expo), NativeWind
- **Audio**: Howler.js (웹), react-native-track-player (모바일)
- **State**: Zustand + TanStack Query

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + Passport.js
- **Real-time**: Socket.IO (라이브 스트리밍)

### Infrastructure
- **Monorepo**: Turborepo
- **Payments**: Stripe, Apple IAP, Google Play Billing
- **Storage**: Cloudflare R2

## Project Structure

```
AudioNest/
├── apps/
│   ├── web/          # Next.js 웹 앱
│   ├── api/          # NestJS 백엔드
│   └── mobile/       # React Native 앱 (Expo)
├── packages/
│   ├── database/     # Prisma 스키마 & 클라이언트
│   └── types/        # 공유 타입 정의
├── turbo.json
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/josens83/AudioNest.git
cd AudioNest

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with sample data
npm run db:seed
```

### Development

```bash
# Run all apps in development
npm run dev

# Run specific app
npm run dev:web    # Web app (http://localhost:3000)
npm run dev:api    # API server (http://localhost:4000)
npm run dev:mobile # Mobile app (Expo)
```

### Build

```bash
# Build all apps
npm run build

# Build specific app
npm run build:web
npm run build:api
```

## Key Features

### Content System
- 오디오북, 팟캐스트, 강의, ASMR 등 다양한 콘텐츠
- 앨범/에피소드 구조
- 카테고리 & 태그 기반 분류
- 검색 기능

### Audio Player
- 미니 플레이어 & 풀 플레이어
- 재생 속도 조절 (0.5x ~ 3.0x)
- 슬립 타이머
- 재생 대기열
- 다기기 동기화

### Subscription System
- **FREE**: 무료 콘텐츠, 광고 포함
- **VIP** (₩7,900/월): 광고 제거, 50개 다운로드, 월 50코인
- **SVIP** (₩14,900/월): VIP + 무제한 다운로드, 독점 콘텐츠, 가족 공유

### Live Streaming
- 실시간 오디오 라이브
- 라이브 채팅
- 선물 시스템

### Creator Features
- 크리에이터 대시보드
- 콘텐츠 업로드
- 수익 관리 (70% 수익 분배)

## API Documentation

API 서버 실행 후 Swagger 문서 확인:
- http://localhost:4000/docs

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-secret"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Payments
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Storage
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="audionest-audio"
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details
