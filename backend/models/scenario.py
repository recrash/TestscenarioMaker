"""
시나리오 생성 관련 Pydantic 모델
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class ScenarioGenerationRequest(BaseModel):
    """시나리오 생성 요청 모델"""
    repo_path: str = Field(..., description="Git 저장소 경로")
    use_performance_mode: bool = Field(default=True, description="성능 최적화 모드 사용 여부")

class TestCase(BaseModel):
    """개별 테스트 케이스 모델"""
    ID: str = Field(..., description="테스트 케이스 ID")
    절차: str = Field(..., description="테스트 절차")
    사전조건: str = Field(..., description="테스트 사전조건")
    데이터: str = Field(..., description="테스트 데이터")
    예상결과: str = Field(..., description="예상 결과")
    종류: str = Field(..., description="테스트 종류")

class ScenarioResponse(BaseModel):
    """시나리오 생성 응답 모델"""
    scenario_description: str = Field(..., alias="Scenario Description", description="시나리오 설명")
    test_scenario_name: str = Field(..., alias="Test Scenario Name", description="테스트 시나리오 이름")
    test_cases: List[TestCase] = Field(..., alias="Test Cases", description="테스트 케이스 목록")

class GenerationStatus(str, Enum):
    """생성 상태 열거형"""
    STARTED = "started"
    ANALYZING_GIT = "analyzing_git"
    STORING_RAG = "storing_rag"
    CALLING_LLM = "calling_llm"
    PARSING_RESPONSE = "parsing_response"
    GENERATING_EXCEL = "generating_excel"
    COMPLETED = "completed"
    ERROR = "error"

class GenerationProgress(BaseModel):
    """생성 진행 상황 모델"""
    status: GenerationStatus
    message: str
    progress: float = Field(ge=0, le=100, description="진행률 (0-100)")
    details: Optional[Dict[str, Any]] = None