"""
FastAPI 백엔드 메인 애플리케이션
TestscenarioMaker의 API 서버
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import sys

# 기존 src 모듈 import를 위한 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.routers import scenario, feedback, rag, files

app = FastAPI(
    title="TestscenarioMaker API",
    description="Git 분석 기반 테스트 시나리오 자동 생성 API",
    version="2.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(scenario.router, prefix="/api/scenario", tags=["scenario"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])
app.include_router(rag.router, prefix="/api/rag", tags=["rag"])
app.include_router(files.router, prefix="/api/files", tags=["files"])

# 정적 파일 서빙 (프로덕션용)
if os.path.exists("frontend/dist"):
    app.mount("/static", StaticFiles(directory="frontend/dist"), name="static")

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "TestscenarioMaker API v2.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )