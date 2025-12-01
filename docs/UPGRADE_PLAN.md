# AudioNest 프로젝트 고도화 계획서
## 바이브 코딩 한계 극복을 위한 단계별 실행 가이드

> 작성일: 2025-12-01
> 대상: AudioNest 프리미엄 오디오 콘텐츠 플랫폼
> 목적: AI 지원 개발의 품질 향상 및 기술 부채 해소

---

## 1. 현황 진단 결과 요약

### 1.1 코드 품질 지표

| 지표 | 현재 상태 | 목표 | 위험도 |
|------|----------|------|--------|
| 코드 중복률 | ~15% (8개 모듈 중복 패턴) | <5% | 🟡 중간 |
| 테스트 커버리지 | 0% | >80% | 🔴 높음 |
| 보안 취약점 | 미검증 | 0 critical/high | 🔴 높음 |
| 타입 안전성 | 혼재 (any 타입 다수) | strict mode | 🟡 중간 |
| 문서화 | Swagger만 부분 적용 | JSDoc 100% | 🟢 낮음 |
| API 일관성 | 85% | 100% | 🟢 낮음 |

### 1.2 식별된 핵심 문제점

#### 🔴 긴급 (Critical)
1. **테스트 코드 완전 부재** - 결제/인증 로직 검증 불가
2. **TypeScript 느슨한 설정** - API 프로젝트 `strictNullChecks: false`
3. **에러 처리 불완전** - Webhook 에러 단순 console.error

#### 🟡 중요 (High)
4. **코드 중복** - Pagination, Follow/Like 패턴 8곳 반복
5. **보안 검증 미흡** - RBAC 미구현, 환경변수 검증 없음
6. **문서화 부족** - JSDoc 0%, 인라인 주석 미흡

#### 🟢 개선 필요 (Medium)
7. **API 응답 구조 불일치** - success vs data/meta
8. **설정 상수 분산** - 3곳에 중복 정의
9. **API 버전 관리 없음** - /api/v1 구조 미적용

---

## 2. Phase 1: 기반 구축 (Week 1-2)

### 2.1 TypeScript 엄격 설정 적용

**목표**: API 프로젝트의 타입 안전성 확보

```json
// apps/api/tsconfig.json 수정
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Claude Code Web 지시사항**:
```
1. apps/api/tsconfig.json의 strict 옵션을 true로 변경
2. 발생하는 모든 타입 에러를 순차적으로 수정
3. any 타입을 구체적인 타입으로 교체
4. 각 수정에 대해 변경 이유와 영향 범위 설명
5. 수정 후 빌드 테스트 실행
```

**예상 수정 필요 파일**:
- `apps/api/src/modules/auth/auth.service.ts` - generateTokens 메서드
- `apps/api/src/modules/users/users.service.ts` - update 메서드
- `apps/api/src/modules/albums/albums.service.ts` - where 조건
- `apps/api/src/modules/subscription/subscription.controller.ts` - configService

### 2.2 환경변수 검증 스키마 구현

**목표**: 필수 환경변수 누락 시 서버 시작 방지

**Claude Code Web 지시사항**:
```
1. Joi 또는 Zod 패키지 설치
2. apps/api/src/config/config.schema.ts 파일 생성
3. 다음 필수 변수에 대한 검증 스키마 작성:
   - DATABASE_URL: 필수, URL 형식
   - JWT_SECRET: 필수, 최소 32자
   - STRIPE_SECRET_KEY: 선택적, sk_ 프리픽스
4. ConfigModule에 validationSchema 적용
5. 검증 실패 시 명확한 에러 메시지 출력
```

### 2.3 Global Exception Filter 구현

**목표**: 일관된 에러 응답 및 로깅

**Claude Code Web 지시사항**:
```
1. apps/api/src/common/filters/http-exception.filter.ts 생성
2. 모든 예외를 캐치하여 표준 응답 형식으로 변환:
   {
     "success": false,
     "error": {
       "code": "ERROR_CODE",
       "message": "사용자 친화적 메시지",
       "timestamp": "ISO8601",
       "path": "/api/endpoint"
     }
   }
3. 민감한 정보(스택트레이스) 프로덕션 환경에서 숨기기
4. 구조화된 로깅 추가 (에러 상세정보)
5. main.ts에 글로벌 필터 등록
```

---

## 3. Phase 2: 테스트 인프라 구축 (Week 3-4)

### 3.1 테스트 환경 설정

**목표**: Jest 테스트 환경 완전 구성

**Claude Code Web 지시사항**:
```
1. apps/api/test 디렉토리 구조 생성:
   /test
     /unit        - 단위 테스트
     /integration - 통합 테스트
     /e2e         - E2E 테스트
     /fixtures    - 테스트 데이터

2. jest.config.js 업데이트:
   - 커버리지 임계값 설정 (80%)
   - 테스트 경로 패턴 정의
   - 모킹 설정

3. 테스트 유틸리티 생성:
   - Prisma 모킹 헬퍼
   - JWT 토큰 생성 헬퍼
   - API 요청 헬퍼
```

### 3.2 핵심 모듈 단위 테스트 작성

**우선순위 1: 인증 모듈**

**Claude Code Web 지시사항**:
```
AuthService 테스트 작성 (apps/api/src/modules/auth/auth.service.spec.ts):

1. validateUser 메서드:
   - 정상: 유효한 이메일/비밀번호로 사용자 반환
   - 에러: 존재하지 않는 이메일
   - 에러: 잘못된 비밀번호
   - 에러: passwordHash가 null인 OAuth 사용자

2. register 메서드:
   - 정상: 새 사용자 생성 및 토큰 반환
   - 에러: 중복 이메일
   - 에러: 중복 username

3. login 메서드:
   - 정상: 토큰 쌍 반환
   - 에러: 잘못된 인증정보

4. 각 테스트에 메타데이터 포함:
   - 테스트 목적
   - 경계 조건 식별
   - 보안 고려사항
```

**우선순위 2: 구독/결제 모듈**

**Claude Code Web 지시사항**:
```
SubscriptionService 테스트 작성:

1. getCurrentSubscription:
   - FREE 사용자
   - VIP 사용자 (만료 전)
   - VIP 사용자 (만료됨)

2. createCheckoutSession:
   - VIP 월간 구독
   - SVIP 연간 구독
   - Stripe 미설정 시 에러

3. handleStripeWebhook:
   - checkout.session.completed 이벤트
   - customer.subscription.updated 이벤트
   - customer.subscription.deleted 이벤트
   - 유효하지 않은 시그니처

4. purchaseCoins:
   - 유효한 패키지
   - 잘못된 패키지 ID

** 보안 테스트 필수 포함:
   - 다른 사용자의 구독 접근 시도
   - 만료된 토큰으로 결제 시도
```

### 3.3 통합 테스트 작성

**Claude Code Web 지시사항**:
```
API 엔드포인트 통합 테스트 (apps/api/test/integration/):

1. auth.integration.spec.ts:
   - POST /auth/register → POST /auth/login → GET /auth/me 플로우
   - 토큰 갱신 플로우

2. episodes.integration.spec.ts:
   - FREE 사용자 → VIP 콘텐츠 접근 거부
   - VIP 사용자 → VIP 콘텐츠 스트리밍 URL 획득
   - 구매한 사용자 → PAID 콘텐츠 접근

3. 테스트 격리:
   - 각 테스트 전후로 DB 초기화
   - 테스트 간 의존성 제거
```

---

## 4. Phase 3: 코드 품질 개선 (Week 5-6)

### 4.1 공통 유틸리티 추출

**목표**: 중복 코드 제거

**Claude Code Web 지시사항**:
```
1. apps/api/src/common/utils/pagination.util.ts 생성:

/**
 * @description 페이지네이션 공통 유틸리티
 * @param options.page 현재 페이지 (1부터 시작)
 * @param options.limit 페이지당 항목 수
 * @returns 페이지네이션 쿼리 옵션 및 메타데이터 생성 함수
 */
export function createPaginationOptions(page = 1, limit = 20) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function createPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}

2. 다음 서비스에서 중복 코드 제거:
   - AlbumsService
   - LibraryService
   - PlaybackService
   - LiveService
   - CreatorsService
   - EpisodesService
   - SearchService
   - SubscriptionService

3. 변경 후 기존 동작 유지 확인 (테스트)
```

### 4.2 응답 구조 표준화

**Claude Code Web 지시사항**:
```
1. apps/api/src/common/interfaces/response.interface.ts 생성:

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

2. apps/api/src/common/interceptors/response.interceptor.ts 생성:
   - 모든 응답을 ApiResponse 형식으로 래핑
   - 기존 { data, meta } 구조 유지하면서 success 추가

3. 현재 불일치하는 응답 수정:
   - LiveService.sendGift() - { success, gift } → { data: { gift } }
   - LibraryService.unsubscribe() - { success } → { data: null }
```

### 4.3 보안 강화

**Claude Code Web 지시사항**:
```
1. RBAC (역할 기반 접근 제어) 구현:

// apps/api/src/common/decorators/roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// apps/api/src/common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  // 사용자 역할 확인 로직
}

2. 다음 엔드포인트에 역할 검증 적용:
   - 크리에이터 전용: 앨범/에피소드 CRUD (구현 예정)
   - 관리자 전용: 사용자 관리 (구현 예정)

3. Rate Limiting 세분화:
   - /auth/login: 5회/분 (브루트포스 방지)
   - /auth/register: 3회/분
   - /subscription/checkout: 10회/시간
   - 일반 API: 100회/분

4. 입력 검증 강화:
   - 모든 DTO에 @Transform 데코레이터 추가 (XSS 방지)
   - sanitize-html 적용
```

---

## 5. Phase 4: 문서화 및 모니터링 (Week 7-8)

### 5.1 JSDoc 문서화

**Claude Code Web 지시사항**:
```
다음 기준으로 모든 공개 API에 JSDoc 추가:

1. 서비스 메서드:
/**
 * @description 메서드의 목적
 * @param {Type} paramName - 파라미터 설명
 * @returns {Promise<ReturnType>} 반환값 설명
 * @throws {ExceptionType} 발생 가능한 예외
 * @example
 * const result = await service.method(param);
 * @security VIP 이상 구독자만 접근 가능
 * @performance O(n) - 대량 데이터 시 주의
 */

2. 우선순위:
   - SubscriptionService (결제 관련 - 비즈니스 크리티컬)
   - AuthService (보안 관련)
   - EpisodesService (핵심 기능)
   - LiveService (복잡한 비즈니스 로직)

3. 복잡한 비즈니스 로직에 인라인 주석:
   - UsersService.updateListenStats() - streak 계산 로직
   - SubscriptionService.activateSubscription() - 구독 활성화 플로우
   - LiveService.sendGift() - 코인 차감 및 정산 로직
```

### 5.2 로깅 시스템 구축

**Claude Code Web 지시사항**:
```
1. Winston 로거 설정:

// apps/api/src/common/logger/logger.service.ts
@Injectable()
export class CustomLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
      ]
    });
  }
}

2. 구조화된 로깅 적용:
   - 요청 ID 추적 (correlation ID)
   - 사용자 ID 포함
   - 실행 시간 측정

3. 중요 이벤트 로깅:
   - 결제 성공/실패
   - 인증 시도 (성공/실패)
   - API 에러
   - 성능 이상 (응답 시간 > 3초)
```

### 5.3 README 및 API 문서 확장

**Claude Code Web 지시사항**:
```
1. README.md 확장:
   - 아키텍처 다이어그램 추가
   - 모듈별 설명
   - 개발 가이드
   - 트러블슈팅 가이드

2. docs/ 디렉토리 생성:
   - /docs/api-guide.md - API 사용 가이드
   - /docs/architecture.md - 시스템 아키텍처
   - /docs/database.md - DB 스키마 설명
   - /docs/deployment.md - 배포 가이드
   - /docs/security.md - 보안 가이드

3. CHANGELOG.md 생성:
   - 버전별 변경사항 기록
   - Breaking changes 명시
```

---

## 6. 품질 게이트 설정

### 6.1 CI/CD 파이프라인 품질 체크

```yaml
# .github/workflows/quality.yml
quality_gates:
  ai_generated_code:
    mandatory_checks:
      - static_analysis_pass_rate: ">= 95%"
      - security_scan_issues: "0 critical, 0 high"
      - test_coverage: ">= 80%"
      - code_duplication: "< 5%"
      - cyclomatic_complexity: "< 10"
    review_requirements:
      - human_review: "mandatory"
      - architecture_review: "for_system_changes"
```

**Claude Code Web 지시사항**:
```
1. GitHub Actions 워크플로우 생성:
   - .github/workflows/ci.yml

2. 품질 체크 단계:
   - TypeScript 빌드 확인
   - ESLint 검사
   - 단위 테스트 실행
   - 커버리지 리포트 생성
   - 보안 스캔 (npm audit)

3. PR 머지 조건:
   - 모든 테스트 통과
   - 커버리지 80% 이상
   - 리뷰어 승인 1명 이상
```

### 6.2 코드 품질 메트릭 대시보드

**Claude Code Web 지시사항**:
```
주간 메트릭 리포트 자동 생성 스크립트:

// scripts/quality-report.ts
1. 다음 지표 수집:
   - 테스트 커버리지
   - 코드 중복률
   - 복잡도 평균
   - 타입 오류 수
   - TODO/FIXME 개수

2. Markdown 리포트 생성:
   - 지난 주 대비 변화
   - 개선/악화 영역 식별
   - 액션 아이템 제안
```

---

## 7. 실행 체크리스트

### 7.1 즉시 실행 (Day 1-3)

- [ ] TypeScript strict 모드 활성화
- [ ] 발생하는 타입 에러 수정
- [ ] Global Exception Filter 구현
- [ ] 환경변수 검증 스키마 적용
- [ ] 초기 보안 스캔 실행

### 7.2 단기 (Week 1-2)

- [ ] Jest 테스트 환경 구성
- [ ] AuthService 단위 테스트 100%
- [ ] SubscriptionService 단위 테스트 100%
- [ ] 페이지네이션 유틸리티 추출
- [ ] API 응답 구조 표준화

### 7.3 중기 (Week 3-4)

- [ ] 모든 서비스 단위 테스트 80%+
- [ ] 통합 테스트 핵심 플로우
- [ ] RBAC 구현
- [ ] Rate Limiting 세분화
- [ ] 로깅 시스템 구축

### 7.4 장기 (Week 5-8)

- [ ] 전체 테스트 커버리지 80%
- [ ] JSDoc 문서화 100%
- [ ] 문서 작성 완료
- [ ] CI/CD 파이프라인 완성
- [ ] 성능 모니터링 구축

---

## 8. 성과 측정 KPI

### 8.1 정량적 목표

| 지표 | 현재 | 4주 후 | 8주 후 |
|------|------|--------|--------|
| 테스트 커버리지 | 0% | 60% | 80% |
| 코드 중복률 | 15% | 8% | <5% |
| TypeScript 에러 | 미측정 | 0 | 0 |
| 보안 취약점 | 미검증 | 0 critical | 0 high |
| API 문서화 | 50% | 80% | 100% |
| 빌드 시간 | - | 측정 | 최적화 |

### 8.2 정성적 목표

- [ ] 새로운 개발자가 30분 내 개발 환경 구성 가능
- [ ] 코드 리뷰 시 AI 생성 코드 품질 우려 해소
- [ ] 프로덕션 배포 전 자동화된 품질 검증 완료
- [ ] 장애 발생 시 10분 내 원인 파악 가능

---

## 9. Claude Code Web 작업 시 필수 준수 사항

모든 코드 생성/수정 시 다음 체크리스트 수행:

```markdown
## 코드 변경 자가 검증

### 타입 안전성
- [ ] any 타입 사용하지 않음
- [ ] null/undefined 체크 포함
- [ ] 함수 반환 타입 명시

### 에러 처리
- [ ] try-catch 적절히 사용
- [ ] 사용자 친화적 에러 메시지
- [ ] 로깅 포함

### 보안
- [ ] 입력 검증 완료
- [ ] SQL 인젝션 방지 확인
- [ ] 민감 정보 노출 없음

### 테스트
- [ ] 단위 테스트 작성
- [ ] 엣지 케이스 커버
- [ ] 에러 케이스 테스트

### 문서화
- [ ] JSDoc 주석 추가
- [ ] 복잡한 로직 설명
- [ ] 변경 사유 기록
```

---

## 10. 다음 단계

이 계획서를 승인하시면, 다음 순서로 구현을 진행합니다:

1. **Phase 1 시작**: TypeScript 엄격 설정 및 기반 구축
2. **테스트 인프라**: Jest 환경 구성 및 핵심 테스트 작성
3. **코드 리팩토링**: 중복 제거 및 품질 개선
4. **문서화 완성**: JSDoc 및 프로젝트 문서

진행하시겠습니까?
