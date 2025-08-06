"""
시나리오 생성 v2 API 라우터
CLI 연동을 위한 clientId 기반 WebSocket 및 상태 관리
"""

import logging
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import JSONResponse
import json
import re
import os
import time
import asyncio
import uuid
from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime, timedelta

# Set up logger for this module
logger = logging.getLogger(__name__)

# Standard library and project module imports
import sys
sys.path.append(str(Path(__file__).resolve().parents[2]))

from src.git_analyzer import get_git_analysis_text
from src.llm_handler import call_ollama_llm, OllamaAPIError
from src.excel_writer import save_results_to_excel
from src.config_loader import load_config
from src.prompt_loader import create_final_prompt, add_git_analysis_to_rag
from backend.models.scenario import (
    ScenarioGenerationRequest, 
    ScenarioResponse, 
    ScenarioMetadata,
    GenerationProgress, 
    GenerationStatus
)

router = APIRouter()

# clientId별 상태 저장소
class ClientState:
    def __init__(self, client_id: str):
        self.client_id = client_id
        self.progress: Optional[GenerationProgress] = None
        self.result: Optional[Dict] = None
        self.websockets: List[WebSocket] = []
        self.created_at = datetime.now()
        self.request_data: Optional[ScenarioGenerationRequest] = None
        self.is_generating = False

class StateManager:
    def __init__(self):
        self.clients: Dict[str, ClientState] = {}
        
    def create_client(self, client_id: str = None) -> str:
        """새 클라이언트 생성 및 ID 반환"""
        if not client_id:
            client_id = str(uuid.uuid4())
        
        self.clients[client_id] = ClientState(client_id)
        logger.info(f"새 클라이언트 생성: {client_id}")
        return client_id
    
    def get_client(self, client_id: str) -> Optional[ClientState]:
        """클라이언트 상태 반환"""
        return self.clients.get(client_id)
    
    def cleanup_old_clients(self, max_age_hours: int = 24):
        """오래된 클라이언트 정리"""
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        to_remove = [
            client_id for client_id, state in self.clients.items()
            if state.created_at < cutoff_time
        ]
        
        for client_id in to_remove:
            del self.clients[client_id]
            logger.info(f"오래된 클라이언트 정리: {client_id}")
    
    async def add_websocket(self, client_id: str, websocket: WebSocket) -> bool:
        """WebSocket을 클라이언트에 추가"""
        client = self.get_client(client_id)
        if not client:
            return False
            
        await websocket.accept()
        client.websockets.append(websocket)
        logger.info(f"WebSocket 연결 추가: {client_id}")
        
        # 현재 상태가 있으면 즉시 전송
        if client.progress:
            await self.send_progress_to_client(client_id, client.progress)
            
        return True
    
    def remove_websocket(self, client_id: str, websocket: WebSocket):
        """WebSocket을 클라이언트에서 제거"""
        client = self.get_client(client_id)
        if client and websocket in client.websockets:
            client.websockets.remove(websocket)
            logger.info(f"WebSocket 연결 제거: {client_id}")
    
    async def send_progress_to_client(self, client_id: str, progress: GenerationProgress):
        """특정 클라이언트의 모든 WebSocket에 진행 상황 전송"""
        client = self.get_client(client_id)
        if not client:
            return
            
        client.progress = progress
        progress_dict = progress.model_dump()
        message = json.dumps(progress_dict)
        
        # 연결이 끊어진 WebSocket 정리를 위한 임시 리스트
        disconnected = []
        
        for websocket in client.websockets:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.warning(f"WebSocket 전송 실패 ({client_id}): {e}")
                disconnected.append(websocket)
        
        # 연결이 끊어진 WebSocket 제거
        for ws in disconnected:
            client.websockets.remove(ws)

# 전역 상태 관리자
state_manager = StateManager()

async def _handle_generation_error(client_id: str, message: str, detail: str = ""):
    """클라이언트별 오류 처리"""
    logger.error(f"{message} (Client: {client_id}) - Detail: {detail}")
    await state_manager.send_progress_to_client(client_id, GenerationProgress(
        status=GenerationStatus.ERROR,
        message=message,
        progress=0
    ))

async def _generate_scenario_for_client(client_id: str, request: ScenarioGenerationRequest):
    """특정 클라이언트를 위한 시나리오 생성 실행"""
    client = state_manager.get_client(client_id)
    if not client:
        logger.error(f"클라이언트를 찾을 수 없음: {client_id}")
        return
    
    if client.is_generating:
        logger.warning(f"이미 생성 중인 클라이언트: {client_id}")
        return
    
    client.is_generating = True
    client.request_data = request
    
    try:
        if not (request.repo_path and Path(request.repo_path).is_dir()):
            await _handle_generation_error(client_id, "유효한 Git 저장소 경로를 입력해주세요.")
            return
        
        config = load_config()
        if not config:
            await _handle_generation_error(client_id, "설정 파일을 로드할 수 없습니다.")
            return

        async def send_progress(status: GenerationStatus, message: str, progress: float, details=None):
            await state_manager.send_progress_to_client(client_id, GenerationProgress(
                status=status, message=message, progress=progress, details=details
            ))

        # 1. Git Analysis
        await send_progress(GenerationStatus.ANALYZING_GIT, "Git 변경 내역을 분석 중입니다...", 10)
        await asyncio.sleep(1)
        git_analysis = get_git_analysis_text(request.repo_path)
        
        # 2. RAG Storage
        await send_progress(GenerationStatus.STORING_RAG, "분석 결과를 RAG 시스템에 저장 중입니다...", 20)
        await asyncio.sleep(1)
        added_chunks = add_git_analysis_to_rag(git_analysis, request.repo_path)
        
        # 3. LLM Call
        await send_progress(GenerationStatus.CALLING_LLM, "LLM을 호출하여 시나리오를 생성 중입니다...", 30)
        await asyncio.sleep(1)
        
        model_name = config.get("model_name", "qwen3:8b")
        timeout = config.get("timeout", 600)
        
        final_prompt = create_final_prompt(
            git_analysis, 
            use_rag=True, 
            use_feedback_enhancement=True,
            performance_mode=request.use_performance_mode
        )
        
        start_time = time.time()
        raw_response = call_ollama_llm(final_prompt, model=model_name, timeout=timeout)
        end_time = time.time()
        
        if not raw_response:
            await _handle_generation_error(client_id, "LLM으로부터 응답을 받지 못했습니다.")
            return
        
        # 4. JSON Parsing
        await send_progress(GenerationStatus.PARSING_RESPONSE, "LLM 응답을 파싱 중입니다...", 80)
        await asyncio.sleep(1)
        json_match = re.search(r'<json>(.*?)</json>', raw_response, re.DOTALL)
        if not json_match:
            await _handle_generation_error(client_id, "LLM 응답에서 JSON 블록을 찾을 수 없습니다.")
            return
        
        result_json = json.loads(json_match.group(1).strip())
        
        # 5. Excel File Generation
        await send_progress(GenerationStatus.GENERATING_EXCEL, "Excel 파일을 생성 중입니다...", 90)
        await asyncio.sleep(1)

        project_root = Path(__file__).resolve().parents[2]
        template_path = project_root / "templates" / "template.xlsx"
        final_filename = save_results_to_excel(result_json, str(template_path))
        
        # Completion
        metadata = ScenarioMetadata(
            llm_response_time=end_time - start_time,
            prompt_size=len(final_prompt),
            added_chunks=added_chunks,
            excel_filename=final_filename
        )
        
        response_data = {
            "scenario_description": result_json.get("Scenario Description", ""),
            "test_scenario_name": result_json.get("Test Scenario Name", ""),
            "test_cases": result_json.get("Test Cases", []),
            "metadata": metadata.model_dump()
        }
        
        client.result = response_data
        
        await send_progress(
            GenerationStatus.COMPLETED, 
            "시나리오 생성이 완료되었습니다!", 
            100,
            {"result": response_data}
        )
        
    except json.JSONDecodeError as e:
        await _handle_generation_error(client_id, "JSON 파싱 오류가 발생했습니다.", str(e))
    except OllamaAPIError as e:
        await _handle_generation_error(client_id, "LLM API 호출 중 오류가 발생했습니다.", str(e))
    except Exception as e:
        await _handle_generation_error(client_id, "시나리오 생성 중 예기치 않은 오류가 발생했습니다.", str(e))
    finally:
        client.is_generating = False

@router.post("/v2/generate/{client_id}")
async def generate_scenario_v2(client_id: str, request: ScenarioGenerationRequest, background_tasks: BackgroundTasks):
    """
    v2 시나리오 생성 엔드포인트 (CLI용)
    clientId를 받아 백그라운드에서 시나리오 생성 시작
    """
    
    # 클라이언트가 존재하지 않으면 생성
    if not state_manager.get_client(client_id):
        state_manager.create_client(client_id)
    
    client = state_manager.get_client(client_id)
    if client.is_generating:
        raise HTTPException(status_code=409, detail="이미 생성이 진행 중입니다.")
    
    # 백그라운드에서 시나리오 생성 시작
    background_tasks.add_task(_generate_scenario_for_client, client_id, request)
    
    return {
        "message": "시나리오 생성이 시작되었습니다.",
        "client_id": client_id,
        "websocket_url": f"/api/v2/ws/progress/{client_id}"
    }

@router.websocket("/v2/ws/progress/{client_id}")
async def websocket_progress_v2(websocket: WebSocket, client_id: str):
    """
    v2 WebSocket 엔드포인트 - clientId별 진행 상황 추적
    """
    
    # 클라이언트가 존재하지 않으면 생성
    if not state_manager.get_client(client_id):
        state_manager.create_client(client_id)
    
    # WebSocket 연결 추가
    success = await state_manager.add_websocket(client_id, websocket)
    if not success:
        await websocket.close(code=4000, reason="Invalid client ID")
        return
    
    try:
        # 연결 유지 (클라이언트가 연결을 끊을 때까지)
        while True:
            try:
                # 클라이언트로부터 메시지 대기 (ping/pong 또는 연결 유지용)
                data = await websocket.receive_text()
                # echo back (연결 상태 확인용)
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": time.time()}))
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        logger.info(f"클라이언트 연결 해제: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket 오류 (Client: {client_id}): {e}")
    finally:
        state_manager.remove_websocket(client_id, websocket)

@router.get("/v2/status/{client_id}")
async def get_client_status_v2(client_id: str):
    """
    v2 클라이언트 상태 조회 엔드포인트
    """
    client = state_manager.get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="클라이언트를 찾을 수 없습니다.")
    
    response = {
        "client_id": client_id,
        "is_generating": client.is_generating,
        "created_at": client.created_at.isoformat(),
        "websocket_connections": len(client.websockets)
    }
    
    if client.progress:
        response["progress"] = client.progress.model_dump()
    
    if client.result:
        response["result"] = client.result
        
    return response

@router.post("/v2/client")
async def create_client_v2():
    """
    새로운 클라이언트 생성 엔드포인트
    """
    client_id = state_manager.create_client()
    return {
        "client_id": client_id,
        "websocket_url": f"/api/v2/ws/progress/{client_id}",
        "generate_url": f"/api/v2/generate/{client_id}",
        "status_url": f"/api/v2/status/{client_id}"
    }

@router.get("/v2/cleanup")
async def cleanup_old_clients_v2():
    """
    오래된 클라이언트 정리 엔드포인트 (관리용)
    """
    old_count = len(state_manager.clients)
    state_manager.cleanup_old_clients()
    new_count = len(state_manager.clients)
    
    return {
        "message": f"{old_count - new_count}개의 오래된 클라이언트를 정리했습니다.",
        "before": old_count,
        "after": new_count
    }

# 주기적으로 오래된 클라이언트 정리 (선택사항)
@router.on_event("startup")
async def setup_cleanup_task():
    """주기적 정리 작업 설정"""
    async def periodic_cleanup():
        while True:
            await asyncio.sleep(3600)  # 1시간마다
            state_manager.cleanup_old_clients()
    
    # 백그라운드 태스크로 실행
    asyncio.create_task(periodic_cleanup())