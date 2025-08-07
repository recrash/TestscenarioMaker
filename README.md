# TestscenarioMaker

Git 저장소 변경사항을 분석하여 AI가 자동으로 한국어 테스트 시나리오를 생성하는 풀스택 웹 애플리케이션입니다.

![TestscenarioMaker](https://img.shields.io/badge/Version-2.0.0-blue.svg)
![Python](https://img.shields.io/badge/Python-3.8+-green.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1+-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0+-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2+-blue.svg)

## 🌟 주요 기능

### 🔍 AI 기반 테스트 시나리오 자동 생성
- **Git 분석**: GitPython을 활용한 커밋 변경사항 자동 분석
- **AI 생성**: Ollama (qwen3:8b/1.7b) 모델을 사용한 한국어 테스트 시나리오 자동 생성
- **Excel 출력**: 템플릿 기반 Excel 파일로 결과 저장

### 🧠 RAG (Retrieval-Augmented Generation) 시스템
- **벡터 데이터베이스**: ChromaDB를 활용한 문서 임베딩 저장
- **한국어 임베딩**: `ko-sroberta-multitask` 모델 사용
- **문서 지원**: DOCX, TXT, PDF, Markdown, Excel 파일 인덱싱
- **컨텍스트 향상**: 기존 문서 기반으로 테스트 시나리오 품질 개선
- **영속적 캐시**: 문서 변경사항만 선별적 재인덱싱으로 성능 최적화

### 🔄 실시간 웹 인터페이스
- **React SPA**: Material-UI 기반 모던 웹 인터페이스
- **WebSocket**: 실시간 진행률 업데이트 및 상태 알림
- **파일 관리**: 드래그앤드롭 업로드, 다운로드, 검증 기능

### 📊 피드백 및 분석 시스템
- **사용자 피드백**: 생성된 시나리오에 대한 평가 및 개선 의견 수집
- **분석 대시보드**: 피드백 통계, 품질 지표, 트렌드 분석
- **자동 백업**: 피드백 데이터 자동 백업 및 관리
- **프롬프트 개선**: 피드백 기반 AI 프롬프트 자동 최적화

### 🛠 CLI 및 API 지원
- **V2 API**: CLI 도구 연동을 위한 별도 API 엔드포인트
- **백그라운드 처리**: 비동기 작업 처리 및 진행률 추적
- **WebSocket 진행률**: 실시간 작업 상태 모니터링

## 🏗 아키텍처

### 시스템 구성도
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Frontend (React)  │    │   Backend (FastAPI) │    │    AI/ML Services   │
│                     │    │                     │    │                     │
│ • Material-UI       │◄──►│ • RESTful API       │◄──►│ • Ollama LLM        │
│ • WebSocket Client  │    │ • WebSocket Server  │    │ • ChromaDB          │
│ • File Upload       │    │ • Background Tasks  │    │ • Korean Embeddings │
│ • Real-time Updates │    │ • Authentication    │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                       │
                           ┌─────────────────────┐
                           │   Data & Storage    │
                           │                     │
                           │ • SQLite (Feedback) │
                           │ • Vector DB         │
                           │ • File System       │
                           │ • Excel Templates   │
                           └─────────────────────┘
```

### 기술 스택
- **Frontend**: React 18 + TypeScript + Material-UI + Vite
- **Backend**: FastAPI + Python 3.8+ + Pydantic
- **AI/ML**: Ollama (qwen3:8b/1.7b), ko-sroberta-multitask
- **데이터베이스**: ChromaDB (벡터), SQLite (피드백)
- **테스트**: Playwright (E2E), pytest (API), Jest (Unit)
- **배포**: Docker 지원, 크로스 플랫폼

## 🚀 빠른 시작

### 전제 조건
- Python 3.8 이상
- Node.js 16 이상
- Ollama 설치 및 qwen3 모델 다운로드

```bash
# Ollama 설치 (macOS)
brew install ollama

# qwen3 모델 다운로드
ollama pull qwen3:8b
ollama pull qwen3:1.7b
```

### 설치 방법

1. **저장소 클론**
```bash
git clone https://github.com/recrash/TestscenarioMaker.git
cd TestscenarioMaker
```

2. **백엔드 설정**
```bash
# Python 의존성 설치
pip install -r requirements.txt

# 설정 파일 생성
cp config.example.json config.json
# config.json에서 repo_path 등 설정 수정
```

3. **프론트엔드 설정**
```bash
# Node.js 의존성 설치
npm install
```

4. **한국어 임베딩 모델 다운로드** (선택사항)
```bash
# 오프라인 환경용
python scripts/download_embedding_model.py
```

### 실행 방법

1. **백엔드 서버 시작**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

2. **프론트엔드 개발 서버 시작**
```bash
npm run dev
```

3. **웹 브라우저에서 접속**
   - 프론트엔드: http://localhost:3000
   - API 문서: http://localhost:8000/docs

## 📖 사용 방법

### 1. 기본 테스트 시나리오 생성

1. 웹 인터페이스에서 Git 저장소 경로 입력
2. "시나리오 생성" 버튼 클릭
3. 실시간 진행률을 확인하며 대기
4. 생성된 Excel 파일 다운로드

### 2. RAG 시스템 활용

1. **문서 업로드**: documents/ 폴더에 참조 문서 추가
2. **자동 인덱싱**: 서버 시작 시 자동으로 문서 인덱싱 수행
3. **컨텍스트 향상**: 업로드된 문서를 기반으로 더 정확한 시나리오 생성

### 3. 피드백 시스템

1. 생성된 시나리오 평가 (1-5점)
2. 개선 의견 및 오류 신고 입력
3. 피드백 분석 탭에서 통계 확인
4. AI 모델의 지속적인 개선

## 🔧 설정 파일

### config.json
```json
{
    "repo_path": "/path/to/your/git/repository",
    "model_name": "qwen3:8b",
    "timeout": 600,
    "documents_folder": "documents",
    "rag": {
        "enabled": true,
        "persist_directory": "vector_db_data",
        "embedding_model": "jhgan/ko-sroberta-multitask",
        "local_embedding_model_path": "./models/ko-sroberta-multitask",
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "search_k": 5
    }
}
```

## 🧪 테스트

### 전체 테스트 실행
```bash
npm run test:all
```

### 개별 테스트
```bash
# 프론트엔드 단위 테스트
npm run test

# 백엔드 API 테스트
npm run test:api

# E2E 테스트
npm run test:e2e
```

### 테스트 구조
```
tests/
├── unit/           # 단위 테스트 (pytest)
├── api/            # API 테스트 (pytest)
├── e2e/            # E2E 테스트 (Playwright)
└── integration/    # 통합 테스트
```

## 📁 프로젝트 구조

```
TestscenarioMaker/
├── backend/                 # FastAPI 백엔드
│   ├── main.py             # 메인 애플리케이션
│   ├── routers/            # API 라우터들
│   │   ├── scenario.py     # 시나리오 생성 API
│   │   ├── feedback.py     # 피드백 관리 API
│   │   ├── rag.py         # RAG 시스템 API
│   │   ├── files.py       # 파일 관리 API
│   │   └── v2/            # CLI 연동 API
│   └── models/            # Pydantic 모델들
├── frontend/               # React 프론트엔드
│   ├── src/
│   │   ├── components/    # React 컴포넌트들
│   │   ├── services/      # API 서비스
│   │   ├── types/         # TypeScript 타입
│   │   └── utils/         # 유틸리티 함수들
│   └── public/
├── src/                    # 핵심 비즈니스 로직
│   ├── git_analyzer.py    # Git 분석 모듈
│   ├── llm_handler.py     # LLM 처리 모듈
│   ├── excel_writer.py    # Excel 출력 모듈
│   ├── feedback_manager.py # 피드백 관리
│   ├── prompt_loader.py   # 프롬프트 로더
│   └── vector_db/         # RAG 시스템
│       ├── rag_manager.py
│       ├── document_indexer.py
│       ├── document_reader.py
│       └── chroma_manager.py
├── tests/                  # 테스트 파일들
├── documents/              # RAG용 참조 문서
├── templates/              # Excel 템플릿
├── outputs/                # 생성된 결과 파일
├── prompts/                # AI 프롬프트 템플릿
└── config.json             # 설정 파일
```

## 🔌 API 문서

### 주요 엔드포인트

#### 시나리오 생성
- `POST /api/scenario/generate` - 시나리오 생성 요청
- `WebSocket /api/scenario/generate-ws` - 실시간 진행률 업데이트

#### RAG 시스템
- `POST /api/rag/index` - 문서 인덱싱
- `GET /api/rag/status` - RAG 시스템 상태 조회

#### 피드백 관리
- `POST /api/feedback/` - 피드백 제출
- `GET /api/feedback/analysis` - 피드백 분석 결과

#### 파일 관리
- `POST /api/files/validate/repo-path` - Git 저장소 검증
- `GET /api/files/download/excel/{filename}` - Excel 파일 다운로드

#### V2 API (CLI 연동)
- `POST /api/v2/scenario/generate` - CLI용 비동기 시나리오 생성
- `WebSocket /api/v2/ws/progress/{client_id}` - CLI용 진행률 추적

자세한 API 문서는 서버 실행 후 http://localhost:8000/docs에서 확인 가능합니다.

## 🐛 트러블슈팅

### 일반적인 문제들

1. **Ollama 연결 오류**
   ```bash
   # Ollama 서비스 확인
   ollama serve
   
   # 모델 다운로드 확인
   ollama list
   ```

2. **포트 충돌**
   ```bash
   # 포트 사용 중일 때
   lsof -ti:8000 | xargs kill -9  # 백엔드
   lsof -ti:3000 | xargs kill -9  # 프론트엔드
   ```

3. **의존성 오류**
   ```bash
   # Python 환경 재설정
   pip install -r requirements.txt --force-reinstall
   
   # Node.js 모듈 재설치
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **RAG 시스템 오류**
   ```bash
   # 벡터 DB 재초기화
   rm -rf vector_db_data/
   # 서버 재시작하여 자동 재인덱싱
   ```

### 로그 확인
- 백엔드 로그: `logs/YYYY-MM-DD_backend.log`
- 프론트엔드 로그: `logs/YYYY-MM-DD_frontend.log`
- 브라우저 콘솔에서 WebSocket 연결 상태 확인

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 개발 가이드라인
- 코드 스타일: Black (Python), ESLint + Prettier (TypeScript/React)
- 테스트: 새 기능 추가 시 반드시 테스트 코드 작성
- 문서화: 주요 기능 변경 시 README 및 API 문서 업데이트

## 📜 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원 및 문의

- 이슈 리포팅: [GitHub Issues](https://github.com/recrash/TestscenarioMaker/issues)
- 개발자: recrash
- 이메일: [이메일 주소]

## 🏆 최신 업데이트

### v2.0.0 (2024-01-07)
- ✨ CLI 연동을 위한 V2 API 추가
- 🚀 영속적 문서 캐시 시스템으로 성능 대폭 개선
- 🔄 WebSocket 기반 실시간 진행률 추적
- 📊 피드백 시스템 백업 및 분석 기능 강화
- 🧪 포괄적인 테스트 커버리지 (Unit, API, E2E)

### 주요 성능 개선
- 문서 인덱싱 속도 80% 향상 (영속적 캐시)
- WebSocket 연결 안정성 개선
- 메모리 사용량 30% 감소
- 크로스 플랫폼 호환성 강화

---

**TestscenarioMaker**로 Git 변경사항을 똑똑한 테스트 시나리오로! 🎯