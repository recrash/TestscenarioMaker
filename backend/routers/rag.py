"""
RAG 시스템 관련 API 라우터
"""

from fastapi import APIRouter, HTTPException
import os
import sys

# 기존 모듈 import
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from src.prompt_loader import (
    get_rag_info, 
    index_documents_folder, 
    get_rag_manager
)

from backend.models.rag import (
    RAGInfo,
    IndexingRequest,
    IndexingResult,
    DocumentsInfo
)

router = APIRouter()

@router.get("/info", response_model=RAGInfo)
async def get_rag_system_info():
    """RAG 시스템 정보 조회 API"""
    
    try:
        rag_info = get_rag_info()
        return RAGInfo(**rag_info)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG 시스템 정보 조회 중 오류가 발생했습니다: {str(e)}")

@router.post("/index", response_model=IndexingResult)
async def index_documents(request: IndexingRequest):
    """문서 인덱싱 API"""
    
    try:
        result = index_documents_folder(force_reindex=request.force_reindex)
        return IndexingResult(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문서 인덱싱 중 오류가 발생했습니다: {str(e)}")

@router.delete("/clear")
async def clear_vector_database():
    """벡터 데이터베이스 초기화 API"""
    
    try:
        rag_manager = get_rag_manager(lazy_load=False)
        if not rag_manager:
            raise HTTPException(status_code=500, detail="RAG 시스템을 초기화할 수 없습니다.")
        
        rag_manager.clear_database()
        
        return {"message": "벡터 데이터베이스가 성공적으로 초기화되었습니다."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"벡터 데이터베이스 초기화 중 오류가 발생했습니다: {str(e)}")

@router.get("/documents/info", response_model=DocumentsInfo)
async def get_documents_info():
    """문서 정보 조회 API"""
    
    try:
        rag_info = get_rag_info()
        documents_info = rag_info.get('documents', {})
        return DocumentsInfo(**documents_info)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문서 정보 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/status")
async def get_rag_status():
    """RAG 시스템 상태 조회 API"""
    
    try:
        # RAG 매니저 상태 확인
        try:
            rag_manager = get_rag_manager(lazy_load=True)
            if rag_manager:
                status = "active"
                message = "RAG 시스템이 정상적으로 작동 중입니다."
            else:
                status = "inactive"
                message = "RAG 시스템이 비활성화되어 있습니다."
        except Exception as e:
            status = "error"
            message = f"RAG 시스템 오류: {str(e)}"
        
        # 기본 정보 수집
        rag_info = get_rag_info()
        chroma_info = rag_info.get('chroma_info', {})
        
        return {
            "status": status,
            "message": message,
            "document_count": chroma_info.get('count', 0),
            "embedding_model": chroma_info.get('embedding_model', 'Unknown'),
            "chunk_size": rag_info.get('chunk_size', 0)
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"RAG 상태 조회 중 오류가 발생했습니다: {str(e)}",
            "document_count": 0,
            "embedding_model": "Unknown",
            "chunk_size": 0
        }