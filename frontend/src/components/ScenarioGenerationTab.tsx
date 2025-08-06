import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  Paper
} from '@mui/material'
import { ExpandMore, Rocket, Psychology, Speed } from '@mui/icons-material'
import { scenarioApi, scenarioApiV2, ragApi, filesApi } from '../services/api'
// v2 WebSocket 사용
import { ScenarioWebSocketV2 } from '../utils/websocket'
import ScenarioResultViewer from './ScenarioResultViewer'
import FeedbackModal from './FeedbackModal'
import RAGSystemPanel from './RAGSystemPanel'
import { type ScenarioResponse, type GenerationProgress, type RAGStatus, GenerationStatus } from '../types'

export default function ScenarioGenerationTab() {
  const [repoPath, setRepoPath] = useState('')
  const [performanceMode, setPerformanceMode] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [result, setResult] = useState<ScenarioResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'like' | 'dislike'>('like')
  const [config, setConfig] = useState<any>(null)

  // v2 API 상태 관리
  const [clientId, setClientId] = useState<string | null>(null)
  const [websocketV2, setWebsocketV2] = useState<ScenarioWebSocketV2 | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')

  useEffect(() => {
    // 컴포넌트 마운트 시 설정과 RAG 상태 로드
    loadConfig()
    loadRagStatus()
    // v2 클라이언트 초기화
    initializeV2Client()
  }, [])

  useEffect(() => {
    // 컴포넌트 언마운트 시 WebSocket 정리
    return () => {
      if (websocketV2) {
        websocketV2.disconnect()
      }
    }
  }, [websocketV2])

  const loadConfig = async () => {
    try {
      const configData = await scenarioApi.getConfig()
      setConfig(configData)
      if (configData.repo_path) {
        setRepoPath(configData.repo_path)
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const loadRagStatus = async () => {
    try {
      const status = await ragApi.getStatus()
      setRagStatus(status)
    } catch (error) {
      console.error('Failed to load RAG status:', error)
    }
  }

  const initializeV2Client = async () => {
    try {
      setConnectionStatus('connecting')
      const clientData = await scenarioApiV2.createClient()
      setClientId(clientData.client_id)
      setConnectionStatus('connected')
      console.log('🎯 v2 클라이언트 생성 완료:', clientData.client_id)
    } catch (error) {
      console.error('Failed to initialize v2 client:', error)
      setError('v2 클라이언트 초기화에 실패했습니다.')
      setConnectionStatus('error')
    }
  }

  const validateRepoPath = async (path: string) => {
    if (!path.trim()) return false
    
    try {
      const validation = await filesApi.validateRepoPath(path)
      return validation.valid
    } catch (error) {
      return false
    }
  }

  const handleGenerateV2 = async () => {
    if (!clientId) {
      setError('클라이언트가 초기화되지 않았습니다. 페이지를 새로고침 해주세요.')
      return
    }

    if (!repoPath.trim()) {
      setError('Git 저장소 경로를 입력해주세요.')
      return
    }

    const isValid = await validateRepoPath(repoPath)
    if (!isValid) {
      setError('유효한 Git 저장소 경로를 입력해주세요.')
      return
    }

    // 상태 초기화
    setError(null)
    setResult(null)
    setIsGenerating(true)
    setProgress({ 
      status: GenerationStatus.STARTED, 
      message: 'v2 시나리오 생성을 시작합니다...', 
      progress: 0 
    })

    try {
      // v2 WebSocket 연결 설정
      const wsUrl = scenarioApiV2.getWebSocketUrlV2(clientId)
      const ws = new ScenarioWebSocketV2(
        clientId,
        wsUrl,
        (progressData) => {
          console.log('📊 v2 진행상황 업데이트:', progressData)
          setProgress(progressData)
          
          // 예상치 못한 상태 처리
          if (!Object.values(GenerationStatus).includes(progressData.status)) {
            console.warn('⚠️ 예상치 못한 상태값:', progressData.status)
            setError(`예상치 못한 상태가 수신되었습니다: ${progressData.status}`)
          }
        },
        (errorMessage) => {
          console.error('❌ v2 WebSocket 오류:', errorMessage)
          setError(errorMessage)
          setIsGenerating(false)
          setProgress(null)
        },
        (resultData) => {
          console.log('🎉 v2 시나리오 생성 완료! 결과:', resultData)
          setResult(resultData)
          setIsGenerating(false)
          setProgress(null)
        }
      )

      setWebsocketV2(ws)
      ws.connect()

      // 잠시 대기 후 CLI 트리거 (WebSocket 연결 안정화)
      setTimeout(() => {
        scenarioApiV2.triggerCLI(clientId, repoPath, performanceMode)
      }, 1000)

    } catch (error) {
      console.error('v2 생성 프로세스 오류:', error)
      setError('시나리오 생성 중 오류가 발생했습니다.')
      setIsGenerating(false)
      setProgress(null)
    }
  }

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedbackType(type)
    setFeedbackModalOpen(true)
  }

  const getProgressColor = () => {
    if (!progress) return 'primary'
    if (progress.status === 'error') return 'error'
    if (progress.status === 'completed') return 'success'
    return 'primary'
  }

  const getConnectionStatusChip = () => {
    const statusConfig = {
      disconnected: { label: '연결 해제', color: 'default' as const },
      connecting: { label: '연결 중...', color: 'warning' as const },
      connected: { label: '연결됨', color: 'success' as const },
      error: { label: '연결 실패', color: 'error' as const }
    }
    
    const config = statusConfig[connectionStatus]
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small"
        sx={{ ml: 2 }}
      />
    )
  }

  return (
    <Box>
      {/* RAG 시스템 정보 */}
      <RAGSystemPanel ragStatus={ragStatus} onStatusUpdate={loadRagStatus} />

      {/* v2 API 연결 상태 표시 */}
      <Card sx={{ mb: 2, backgroundColor: 'rgba(33, 150, 243, 0.04)' }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              🚀 v2 API 상태 {clientId && `(Client ID: ${clientId})`}
            </Typography>
            {getConnectionStatusChip()}
          </Box>
        </CardContent>
      </Card>

      {/* 입력 폼 */}
      <Card 
        sx={{ 
          mb: 4, 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
          border: '2px solid rgba(33, 150, 243, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #2196f3 0%, #1976d2 100%)'
          }
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Rocket sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h5" fontWeight={700} color="primary.main">
              시나리오 생성 설정 (v2)
            </Typography>
            <Chip 
              label="CLI 연동" 
              color="primary" 
              size="small" 
              sx={{ ml: 2, fontWeight: 600 }}
            />
          </Box>
          
          <TextField
            fullWidth
            label="Git 저장소 경로"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="/path/to/your/git/repository"
            disabled={isGenerating || connectionStatus !== 'connected'}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 1)'
                }
              }
            }}
            helperText={
              connectionStatus !== 'connected' 
                ? "v2 API 연결이 필요합니다" 
                : "분석할 Git 저장소의 로컬 경로를 입력하세요"
            }
          />

          <Box 
            sx={{ 
              p: 3, 
              backgroundColor: 'rgba(33, 150, 243, 0.04)',
              borderRadius: 3,
              border: '1px solid rgba(33, 150, 243, 0.1)',
              mb: 3
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={performanceMode}
                  onChange={(e) => setPerformanceMode(e.target.checked)}
                  disabled={isGenerating || connectionStatus !== 'connected'}
                  sx={{
                    '& .MuiSvgIcon-root': {
                      fontSize: 24
                    }
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                  <Speed fontSize="small" color="primary" />
                  <Typography variant="body1" fontWeight={500}>
                    성능 최적화 모드
                  </Typography>
                  <Chip 
                    label="권장" 
                    size="small" 
                    color="primary" 
                    sx={{ 
                      fontWeight: 600,
                      background: 'linear-gradient(45deg, #2196f3 30%, #1976d2 90%)'
                    }}
                  />
                </Box>
              }
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
              프롬프트 크기를 제한하여 LLM 응답 속도를 향상시킵니다.
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            size="large"
            onClick={handleGenerateV2}
            disabled={isGenerating || connectionStatus !== 'connected'}
            startIcon={<Rocket />}
            fullWidth
            sx={{
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 700,
              background: isGenerating || connectionStatus !== 'connected'
                ? 'linear-gradient(45deg, #bdbdbd 30%, #9e9e9e 90%)' 
                : 'linear-gradient(45deg, #2196f3 30%, #1976d2 90%)',
              boxShadow: '0 6px 20px rgba(33, 150, 243, 0.3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976d2 30%, #1565c0 90%)',
                boxShadow: '0 8px 25px rgba(33, 150, 243, 0.4)',
                transform: 'translateY(-2px)'
              },
              '&:disabled': {
                background: 'linear-gradient(45deg, #bdbdbd 30%, #9e9e9e 90%)',
                color: 'white'
              }
            }}
          >
            {isGenerating ? '생성 중... (CLI 연동)' : 'v2 테스트 시나리오 생성하기'}
          </Button>

          {/* 비활성화된 v1 버튼 (참고용) */}
          <Button
            variant="outlined"
            size="small"
            disabled={true}
            sx={{ mt: 1, width: '100%', opacity: 0.5 }}
          >
            ⚠️ v1 API (비활성화됨)
          </Button>
        </CardContent>
      </Card>

      {/* 진행 상황 표시 */}
      {progress && (
        <Card 
          sx={{ 
            mb: 4,
            background: progress.status === 'error' 
              ? 'linear-gradient(135deg, #ffebee 0%, #ffffff 100%)'
              : 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
            border: progress.status === 'error' 
              ? '2px solid rgba(244, 67, 54, 0.2)'
              : '2px solid rgba(33, 150, 243, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box 
                sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '50%', 
                  background: progress.status === 'error' 
                    ? 'linear-gradient(45deg, #f44336 30%, #d32f2f 90%)'
                    : 'linear-gradient(45deg, #2196f3 30%, #1976d2 90%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  boxShadow: progress.status === 'error' 
                    ? '0 4px 12px rgba(244, 67, 54, 0.3)'
                    : '0 4px 12px rgba(33, 150, 243, 0.3)'
                }}
              >
                <Psychology sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h5" fontWeight={700} color={progress.status === 'error' ? 'error.main' : 'primary.main'}>
                  {progress.status === 'error' ? '오류 발생' : 'v2 생성 진행 상황'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                  {progress.message}
                </Typography>
              </Box>
              <Chip
                label={progress.status === 'error' ? 'ERROR' : `${progress.progress.toFixed(0)}%`}
                color={progress.status === 'error' ? 'error' : 'primary'}
                sx={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  height: 40,
                  background: progress.status === 'error' 
                    ? 'linear-gradient(45deg, #f44336 30%, #d32f2f 90%)'
                    : 'linear-gradient(45deg, #2196f3 30%, #1976d2 90%)'
                }}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={progress.status === 'error' ? 0 : progress.progress}
                color={getProgressColor()}
                sx={{ 
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: progress.status === 'error' 
                    ? 'rgba(244, 67, 54, 0.1)'
                    : 'rgba(33, 150, 243, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 6,
                    background: progress.status === 'error' 
                      ? 'linear-gradient(90deg, #f44336 0%, #d32f2f 100%)'
                      : 'linear-gradient(90deg, #2196f3 0%, #1976d2 100%)'
                  }
                }}
              />
            </Box>
            
            {progress.details && (
              <Box 
                sx={{ 
                  mt: 3,
                  p: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 2,
                  border: '1px solid rgba(33, 150, 243, 0.1)'
                }}
              >
                <Grid container spacing={2}>
                  {progress.details.llm_response_time && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          ⏱️ LLM 응답 시간: 
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ ml: 1 }}>
                          {progress.details.llm_response_time.toFixed(1)}초
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {progress.details.prompt_size && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          📏 프롬프트 크기: 
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ ml: 1 }}>
                          {progress.details.prompt_size.toLocaleString()}자
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* 오류 표시 */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            connectionStatus === 'error' && (
              <Button color="inherit" size="small" onClick={initializeV2Client}>
                재연결
              </Button>
            )
          }
        >
          {error}
        </Alert>
      )}

      {/* 결과 표시 */}
      {result && (
        <Box>
          <Card 
            sx={{ 
              mb: 4,
              background: 'linear-gradient(135deg, #e8f5e8 0%, #ffffff 100%)',
              border: '2px solid rgba(76, 175, 80, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Box 
                  sx={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(45deg, #4caf50 30%, #388e3c 90%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 3,
                    boxShadow: '0 6px 16px rgba(76, 175, 80, 0.3)'
                  }}
                >
                  <Typography sx={{ fontSize: '2rem' }}>✅</Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    v2 테스트 시나리오 생성 완료!
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                    CLI 연동을 통해 생성되었습니다
                  </Typography>
                </Box>
              </Box>

              {result.metadata && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'text.secondary' }}>
                    📊 생성 통계
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 3, 
                          textAlign: 'center',
                          background: 'linear-gradient(135deg, #fff3e0 0%, #ffffff 100%)',
                          border: '1px solid rgba(255, 152, 0, 0.2)',
                          borderRadius: 3
                        }}
                      >
                        <Typography variant="h4" fontWeight={700} color="warning.main" sx={{ mb: 1 }}>
                          {result.metadata.llm_response_time.toFixed(1)}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          ⏱️ LLM 응답 시간 (초)
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 3, 
                          textAlign: 'center',
                          background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
                          border: '1px solid rgba(33, 150, 243, 0.2)',
                          borderRadius: 3
                        }}
                      >
                        <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                          {result.metadata.prompt_size.toLocaleString()}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          📏 프롬프트 크기 (문자)
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 3, 
                          textAlign: 'center',
                          background: 'linear-gradient(135deg, #f3e5f5 0%, #ffffff 100%)',
                          border: '1px solid rgba(156, 39, 176, 0.2)',
                          borderRadius: 3
                        }}
                      >
                        <Typography variant="h4" fontWeight={700} color="secondary.main" sx={{ mb: 1 }}>
                          {result.metadata.added_chunks}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          🧩 RAG 청크 수 (개)
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>

          <ScenarioResultViewer result={result} onFeedback={handleFeedback} />
        </Box>
      )}

      {/* 피드백 모달 */}
      {result && (
        <FeedbackModal
          open={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          feedbackType={feedbackType}
          result={result}
          repoPath={repoPath}
        />
      )}
    </Box>
  )
}