import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material'
import { ThumbUp, ThumbDown } from '@mui/icons-material'
import type { ScenarioResponse, TestCase } from '../types'

interface ScenarioResultViewerProps {
  result: ScenarioResponse
  onFeedback: (type: 'like' | 'dislike') => void
}

export default function ScenarioResultViewer({ result, onFeedback }: ScenarioResultViewerProps) {
  // 텍스트에서 \n을 실제 줄바꿈으로 변환
  const formatText = (text: string) => {
    return text.replace(/\\n/g, '\n')
  }

  return (
    <Box>
      {/* 시나리오 개요 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 생성 결과 미리보기
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              개요
            </Typography>
            <Typography variant="body1">
              {result.scenario_description}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              제목
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {result.test_scenario_name}
            </Typography>
          </Box>

          {/* 피드백 버튼 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              📝 시나리오 평가 및 피드백
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              생성된 시나리오에 대한 평가를 남겨주시면 향후 더 나은 시나리오 생성에 도움이 됩니다.
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>
              이 시나리오가 도움이 되었나요?
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ThumbUp />}
                onClick={() => onFeedback('like')}
                color="primary"
              >
                좋아요
              </Button>
              <Button
                variant="outlined"
                startIcon={<ThumbDown />}
                onClick={() => onFeedback('dislike')}
                color="error"
              >
                개선 필요
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 테스트 케이스 테이블 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            테스트 케이스 ({result.test_cases.length}개)
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>절차</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>사전조건</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>데이터</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>예상결과</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Unit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Integration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.test_cases.map((testCase: TestCase, index: number) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {testCase.ID}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {formatText(testCase.절차)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {formatText(testCase.사전조건)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {formatText(testCase.데이터)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {formatText(testCase.예상결과)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {testCase.Unit ? (
                        <Chip 
                          label="Y" 
                          size="small" 
                          variant="filled"
                          color="primary"
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {testCase.Integration ? (
                        <Chip 
                          label="Y" 
                          size="small" 
                          variant="filled"
                          color="secondary"
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}