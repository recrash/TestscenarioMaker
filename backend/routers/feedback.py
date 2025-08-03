"""
피드백 관련 API 라우터
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import os
import sys
import logging

# 기존 모듈 import
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from src.feedback_manager import FeedbackManager
from src.prompt_loader import get_prompt_enhancer, reset_feedback_cache

from backend.models.feedback import (
    FeedbackRequest,
    FeedbackStats,
    FeedbackExample,
    ImprovementInsights,
    FeedbackCategory
)

# 로거 설정
logger = logging.getLogger(__name__)

router = APIRouter()

# 피드백 매니저 인스턴스
feedback_manager = FeedbackManager()

@router.post("/submit")
async def submit_feedback(request: FeedbackRequest):
    """피드백 제출 API"""
    
    logger.info(f"피드백 제출 요청: type={request.feedback_type}, comments_length={len(request.comments) if request.comments else 0}")
    
    try:
        # 피드백 데이터 구성
        feedback_data = {
            'overall_score': 4 if request.feedback_type == 'like' else 2,
            'usefulness_score': 4 if request.feedback_type == 'like' else 2,
            'accuracy_score': 4 if request.feedback_type == 'like' else 2,
            'completeness_score': 4 if request.feedback_type == 'like' else 2,
            'category': 'good' if request.feedback_type == 'like' else 'bad',
            'comments': request.comments,
            'testcase_feedback': [tc.dict() for tc in request.testcase_feedback]
        }
        
        logger.debug(f"피드백 데이터 구성 완료: testcase_feedback_count={len(feedback_data['testcase_feedback'])}")
        
        success = feedback_manager.save_feedback(
            git_analysis=request.git_analysis,
            scenario_content=request.scenario_content,
            feedback_data=feedback_data,
            repo_path=request.repo_path
        )
        
        if not success:
            logger.error("피드백 저장 실패")
            raise HTTPException(status_code=500, detail="피드백 저장 중 오류가 발생했습니다.")
        
        logger.info(f"피드백 제출 성공: type={request.feedback_type}")
        return {"message": "피드백이 성공적으로 제출되었습니다.", "success": True}
        
    except Exception as e:
        logger.error(f"피드백 제출 실패: type={request.feedback_type}, error={str(e)}")
        raise HTTPException(status_code=500, detail=f"피드백 제출 중 오류가 발생했습니다: {str(e)}")

@router.get("/stats", response_model=FeedbackStats)
async def get_feedback_stats():
    """피드백 통계 조회 API"""
    
    logger.info("피드백 통계 조회 요청")
    
    try:
        stats = feedback_manager.get_feedback_stats()
        logger.info(f"피드백 통계 조회 성공: total_feedback={stats.get('total_feedback', 0)}")
        return FeedbackStats(**stats)
        
    except Exception as e:
        logger.error(f"피드백 통계 조회 실패: error={str(e)}")
        raise HTTPException(status_code=500, detail=f"피드백 통계 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/examples/{category}")
async def get_feedback_examples(category: FeedbackCategory, limit: int = 5):
    """피드백 예시 조회 API"""
    
    logger.info(f"피드백 예시 조회 요청: category={category}, limit={limit}")
    
    try:
        examples = feedback_manager.get_feedback_examples(category.value, limit)
        logger.info(f"피드백 예시 조회 성공: category={category}, count={len(examples)}")
        return {"examples": examples}
        
    except Exception as e:
        logger.error(f"피드백 예시 조회 실패: category={category}, error={str(e)}")
        raise HTTPException(status_code=500, detail=f"피드백 예시 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/insights", response_model=ImprovementInsights)
async def get_improvement_insights():
    """개선 인사이트 조회 API"""
    
    logger.info("개선 인사이트 조회 요청")
    
    try:
        insights = feedback_manager.get_improvement_insights()
        logger.info(f"개선 인사이트 조회 성공: negative_feedback_count={insights.get('negative_feedback_count', 0)}")
        return ImprovementInsights(**insights)
        
    except Exception as e:
        logger.error(f"개선 인사이트 조회 실패: error={str(e)}")
        raise HTTPException(status_code=500, detail=f"개선 인사이트 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/prompt-enhancement")
async def get_prompt_enhancement_info():
    """프롬프트 개선 정보 조회 API"""
    
    logger.info("프롬프트 개선 정보 조회 요청")
    
    try:
        prompt_enhancer = get_prompt_enhancer()
        enhancement_summary = prompt_enhancer.get_enhancement_summary()
        
        logger.info(f"프롬프트 개선 정보 조회 성공: enhancement_count={len(enhancement_summary.get('enhancements', []))}")
        return enhancement_summary
        
    except Exception as e:
        logger.error(f"프롬프트 개선 정보 조회 실패: error={str(e)}")
        raise HTTPException(status_code=500, detail=f"프롬프트 개선 정보 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/prompt-enhancement/preview")
async def get_enhancement_preview():
    """프롬프트 개선 미리보기 API"""
    
    logger.info("프롬프트 개선 미리보기 요청")
    
    try:
        prompt_enhancer = get_prompt_enhancer()
        preview = prompt_enhancer.get_enhanced_prompt_preview()
        
        logger.info("프롬프트 개선 미리보기 성공")
        return {"preview": preview}
        
    except Exception as e:
        logger.error(f"프롬프트 개선 미리보기 실패: error={str(e)}")
        raise HTTPException(status_code=500, detail=f"프롬프트 개선 미리보기 중 오류가 발생했습니다: {str(e)}")

@router.post("/prompt-enhancement/apply")
async def apply_prompt_enhancement():
    """프롬프트 개선 적용 API"""
    
    logger.info("프롬프트 개선 적용 요청")
    
    try:
        prompt_enhancer = get_prompt_enhancer()
        success = prompt_enhancer.apply_enhancements()
        
        if success:
            logger.info("프롬프트 개선 적용 성공")
            return {"message": "프롬프트 개선이 성공적으로 적용되었습니다.", "success": True}
        else:
            logger.error("프롬프트 개선 적용 실패")
            raise HTTPException(status_code=500, detail="프롬프트 개선 적용 중 오류가 발생했습니다.")
        
    except Exception as e:
        logger.error(f"프롬프트 개선 적용 실패: error={str(e)}")
        raise HTTPException(status_code=500, detail=f"프롬프트 개선 적용 중 오류가 발생했습니다: {str(e)}")

@router.get("/export")
async def export_feedback_data():
    """피드백 데이터 내보내기 API"""
    
    logger.info("피드백 데이터 내보내기 요청")
    
    try:
        # 피드백 데이터 내보내기 로직
        export_data = feedback_manager.export_feedback_data()
        
        logger.info(f"피드백 데이터 내보내기 성공: record_count={len(export_data.get('records', []))}")
        return export_data
        
    except Exception as e:
        logger.error(f"피드백 데이터 내보내기 실패: error={str(e)}")
        raise HTTPException(status_code=500, detail=f"피드백 데이터 내보내기 중 오류가 발생했습니다: {str(e)}")

@router.get("/count-by-category")
async def get_feedback_count_by_category():
    """카테고리별 피드백 개수 조회 API"""
    
    logger.info("카테고리별 피드백 개수 조회 요청")
    
    try:
        counts = feedback_manager.get_feedback_count_by_category()
        logger.info(f"카테고리별 피드백 개수 조회 성공: categories={list(counts.keys())}")
        return counts
        
    except Exception as e:
        logger.error(f"카테고리별 피드백 개수 조회 실패: error={str(e)}")
        raise HTTPException(status_code=500, detail=f"카테고리별 피드백 개수 조회 중 오류가 발생했습니다: {str(e)}")

@router.delete("/reset/all")
async def reset_all_feedback(create_backup: bool = True):
    """모든 피드백 초기화 API"""
    
    logger.info(f"모든 피드백 초기화 요청: create_backup={create_backup}")
    
    try:
        success = feedback_manager.reset_all_feedback(create_backup=create_backup)
        
        if success:
            logger.info("모든 피드백 초기화 성공")
            return {"message": "모든 피드백이 성공적으로 초기화되었습니다.", "success": True}
        else:
            logger.error("모든 피드백 초기화 실패")
            raise HTTPException(status_code=500, detail="피드백 초기화 중 오류가 발생했습니다.")
        
    except Exception as e:
        logger.error(f"모든 피드백 초기화 실패: error={str(e)}")
        raise HTTPException(status_code=500, detail=f"피드백 초기화 중 오류가 발생했습니다: {str(e)}")

@router.delete("/reset/category/{category}")
async def reset_feedback_by_category(category: FeedbackCategory, create_backup: bool = True):
    """카테고리별 피드백 초기화 API"""
    
    logger.info(f"카테고리별 피드백 초기화 요청: category={category}, create_backup={create_backup}")
    
    try:
        success = feedback_manager.reset_feedback_by_category(category.value, create_backup=create_backup)
        
        if success:
            logger.info(f"카테고리별 피드백 초기화 성공: category={category}")
            return {"message": f"{category} 카테고리의 피드백이 성공적으로 초기화되었습니다.", "success": True}
        else:
            logger.error(f"카테고리별 피드백 초기화 실패: category={category}")
            raise HTTPException(status_code=500, detail="피드백 초기화 중 오류가 발생했습니다.")
        
    except Exception as e:
        logger.error(f"카테고리별 피드백 초기화 실패: category={category}, error={str(e)}")
        raise HTTPException(status_code=500, detail=f"피드백 초기화 중 오류가 발생했습니다: {str(e)}")

@router.post("/cache/reset")
async def reset_feedback_cache():
    """피드백 캐시 초기화 API"""
    
    logger.info("피드백 캐시 초기화 요청")
    
    try:
        reset_feedback_cache()
        logger.info("피드백 캐시 초기화 성공")
        return {"message": "피드백 캐시가 성공적으로 초기화되었습니다.", "success": True}
        
    except Exception as e:
        logger.error(f"피드백 캐시 초기화 실패: error={str(e)}")
        raise HTTPException(status_code=500, detail=f"피드백 캐시 초기화 중 오류가 발생했습니다: {str(e)}")