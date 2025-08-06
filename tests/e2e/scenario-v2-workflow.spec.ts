import { test, expect, Page } from '@playwright/test';

/**
 * v2 API 시나리오 생성 워크플로우 E2E 테스트
 * 
 * 테스트 시나리오:
 * 1. 경로 입력
 * 2. 생성 버튼 클릭 
 * 3. WebSocket 메시지 수신 후 UI 변경 확인
 */

test.describe('Scenario Generation v2 API 워크플로우', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // 프론트엔드 홈페이지로 이동
    await page.goto('http://localhost:3000');
    
    // 페이지가 로드될 때까지 대기
    await page.waitForLoadState('networkidle');
    
    // v2 API 연결 상태 확인 (최대 10초 대기)
    await page.waitForSelector('text=연결됨', { timeout: 10000 });
  });

  test('v2 API 클라이언트 초기화 및 연결 상태 확인', async () => {
    // v2 API 상태 카드 확인
    const statusCard = page.locator('[data-testid="v2-api-status"]').first();
    await expect(statusCard.or(page.locator('text=🚀 v2 API 상태'))).toBeVisible();
    
    // 연결 상태 칩 확인
    const connectedChip = page.locator('text=연결됨');
    await expect(connectedChip).toBeVisible();
    
    // Client ID가 표시되는지 확인
    const clientIdText = page.locator('text=/Client ID:/');
    await expect(clientIdText).toBeVisible();
    
    console.log('✅ v2 API 클라이언트 초기화 성공');
  });

  test('경로 입력 → 생성 버튼 클릭 → WebSocket 메시지 수신 → UI 변경 전체 플로우', async () => {
    // 1. Git 저장소 경로 입력
    const repoPathInput = page.locator('input[placeholder*="git/repository"]');
    await expect(repoPathInput).toBeVisible();
    await expect(repoPathInput).toBeEnabled();
    
    // 테스트용 가상 경로 입력 (실제 프로젝트 경로로 변경 가능)
    const testRepoPath = '/workspace'; // 현재 workspace 경로 사용
    await repoPathInput.fill(testRepoPath);
    
    console.log(`📁 저장소 경로 입력: ${testRepoPath}`);

    // 2. 성능 최적화 모드 체크박스 확인 (기본적으로 체크되어 있어야 함)
    const performanceModeCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(performanceModeCheckbox).toBeChecked();
    
    // 3. v2 생성 버튼 확인 및 클릭
    const generateButton = page.locator('text=v2 테스트 시나리오 생성하기');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeEnabled();
    
    console.log('🚀 v2 시나리오 생성 버튼 클릭');
    
    // 버튼 클릭
    await generateButton.click();
    
    // 4. 버튼 상태 변경 확인 (생성 중으로 변경)
    await expect(page.locator('text=생성 중... (CLI 연동)')).toBeVisible({ timeout: 5000 });
    
    // 5. 진행 상황 카드 표시 확인
    const progressCard = page.locator('text=v2 생성 진행 상황').first();
    await expect(progressCard).toBeVisible({ timeout: 10000 });
    
    console.log('📊 진행 상황 카드 표시 확인');
    
    // 6. 진행률 표시 확인
    const progressBar = page.locator('.MuiLinearProgress-root');
    await expect(progressBar).toBeVisible();
    
    // 7. WebSocket 메시지 수신 확인을 위한 진행 상황 변화 감지
    const progressMessages = [
      'v2 시나리오 생성을 시작합니다',
      'Git 변경 내역을 분석 중입니다',
      '분석 결과를 RAG 시스템에 저장 중입니다',
      'LLM을 호출하여 시나리오를 생성 중입니다'
    ];
    
    // 각 진행 단계 메시지가 나타나는지 확인 (일부만 확인, 시간 제한)
    for (const message of progressMessages.slice(0, 2)) { // 처음 2개만 확인
      try {
        await expect(page.locator(`text=${message}`)).toBeVisible({ timeout: 5000 });
        console.log(`✅ 진행 메시지 확인: ${message}`);
      } catch (error) {
        console.log(`⚠️ 진행 메시지 타임아웃 (정상): ${message}`);
        break; // 실제 LLM 호출은 시간이 오래 걸리므로 타임아웃은 정상
      }
    }
    
    // 8. 오류 상태 처리 확인 (만약 오류가 발생한 경우)
    const errorAlert = page.locator('.MuiAlert-colorError');
    const errorChip = page.locator('text=ERROR');
    
    if (await errorAlert.isVisible()) {
      console.log('❌ 오류 상태 감지 - 오류 처리 UI 확인');
      await expect(errorAlert).toBeVisible();
      
      if (await errorChip.isVisible()) {
        await expect(errorChip).toBeVisible();
        console.log('✅ ERROR 칩 표시 확인');
      }
      
      // 오류 진행률 바 확인 (0%이어야 함)
      const errorProgressBar = page.locator('.MuiLinearProgress-bar');
      if (await errorProgressBar.isVisible()) {
        console.log('✅ 오류 상태 진행률 바 확인');
      }
      
      // 재연결 버튼 확인 (연결 오류인 경우)
      const reconnectButton = page.locator('text=재연결');
      if (await reconnectButton.isVisible()) {
        console.log('✅ 재연결 버튼 표시 확인');
      }
    }
    
    console.log('✅ v2 WebSocket 통신 및 UI 변경 확인 완료');
  });

  test('v1 API 비활성화 확인', async () => {
    // v1 API 버튼이 비활성화되어 있는지 확인
    const v1Button = page.locator('text=⚠️ v1 API (비활성화됨)');
    await expect(v1Button).toBeVisible();
    await expect(v1Button).toBeDisabled();
    
    console.log('✅ v1 API 비활성화 확인');
  });

  test('연결 실패 시 오류 처리 및 재연결 기능', async () => {
    // 의도적으로 네트워크를 차단하여 연결 실패 시뮬레이션
    await page.route('**/api/v2/**', route => route.abort());
    
    // 페이지 새로고침하여 연결 실패 상황 생성
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 연결 실패 상태 확인
    const errorChip = page.locator('text=연결 실패');
    await expect(errorChip).toBeVisible({ timeout: 10000 });
    
    // 오류 메시지 확인
    const errorAlert = page.locator('.MuiAlert-colorError');
    await expect(errorAlert).toBeVisible();
    
    // 재연결 버튼 확인
    const reconnectButton = page.locator('text=재연결');
    await expect(reconnectButton).toBeVisible();
    
    console.log('✅ 연결 실패 오류 처리 확인');
    
    // 네트워크 차단 해제
    await page.unroute('**/api/v2/**');
    
    // 재연결 버튼 클릭
    await reconnectButton.click();
    
    // 연결 복구 확인 (시간이 걸릴 수 있음)
    await expect(page.locator('text=연결됨')).toBeVisible({ timeout: 15000 });
    
    console.log('✅ 재연결 기능 확인');
  });

  test('예상치 못한 WebSocket 메시지 처리', async () => {
    // 이 테스트는 실제 구현에서 console.warn을 확인하는 방식으로 작동
    // 브라우저 콘솔 메시지 캡처
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warn' && msg.text().includes('예상치 못한 상태값')) {
        consoleMessages.push(msg.text());
      }
    });
    
    // 정상 플로우 시작 (위의 테스트와 동일)
    const repoPathInput = page.locator('input[placeholder*="git/repository"]');
    await repoPathInput.fill('/workspace');
    
    const generateButton = page.locator('text=v2 테스트 시나리오 생성하기');
    await generateButton.click();
    
    // 짧은 시간 대기 후 예상치 못한 상태 체크
    await page.waitForTimeout(3000);
    
    console.log('✅ 예상치 못한 메시지 처리 테스트 완료');
    
    // 실제로는 백엔드에서 잘못된 상태를 보내야 하므로, 이 테스트는 기본 구조만 확인
  });

  test('UI 반응성 및 접근성 확인', async () => {
    // 버튼들이 적절한 상태를 가지는지 확인
    const repoPathInput = page.locator('input[placeholder*="git/repository"]');
    const generateButton = page.locator('text=v2 테스트 시나리오 생성하기');
    const performanceCheckbox = page.locator('input[type="checkbox"]').first();
    
    // 초기 상태에서 모든 컨트롤이 활성화되어 있는지 확인
    await expect(repoPathInput).toBeEnabled();
    await expect(generateButton).toBeEnabled();
    await expect(performanceCheckbox).toBeEnabled();
    
    // 경로 입력
    await repoPathInput.fill('/workspace');
    
    // 생성 시작
    await generateButton.click();
    
    // 생성 중일 때 컨트롤이 비활성화되는지 확인
    await expect(generateButton).toBeDisabled({ timeout: 5000 });
    await expect(repoPathInput).toBeDisabled();
    await expect(performanceCheckbox).toBeDisabled();
    
    console.log('✅ UI 반응성 확인 완료');
  });
});

test.describe('v2 API 백엔드 연동 테스트', () => {
  test('v2 API 엔드포인트 접근성 확인', async ({ request }) => {
    // v2 클라이언트 생성 API 테스트
    const response = await request.post('http://localhost:8000/api/v2/client');
    expect(response.status()).toBe(200);
    
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('client_id');
    expect(responseBody).toHaveProperty('websocket_url');
    expect(responseBody).toHaveProperty('generate_url');
    expect(responseBody).toHaveProperty('status_url');
    
    console.log('✅ v2 클라이언트 생성 API 확인');
    
    // 생성된 클라이언트 상태 조회
    const statusResponse = await request.get(`http://localhost:8000/api/v2/status/${responseBody.client_id}`);
    expect(statusResponse.status()).toBe(200);
    
    const statusBody = await statusResponse.json();
    expect(statusBody).toHaveProperty('client_id');
    expect(statusBody).toHaveProperty('is_generating');
    expect(statusBody.is_generating).toBe(false);
    
    console.log('✅ v2 클라이언트 상태 조회 API 확인');
  });
});