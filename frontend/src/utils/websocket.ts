import type { GenerationProgress } from '../types';
import logger from './logger';

export class ScenarioWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private onProgressCallback: (progress: GenerationProgress) => void;
  private onErrorCallback: (error: string) => void;
  private onCompleteCallback: (result: any) => void;

  constructor(
    url: string,
    onProgress: (progress: GenerationProgress) => void,
    onError: (error: string) => void,
    onComplete: (result: any) => void
  ) {
    this.url = url;
    this.onProgressCallback = onProgress;
    this.onErrorCallback = onError;
    this.onCompleteCallback = onComplete;
  }

  connect(request: any) {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        logger.info('WebSocket connected', { url: this.url });
        this.ws?.send(JSON.stringify(request));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.info('WebSocket message received:', data);
          
          if (data.status === 'error') {
            logger.error('WebSocket message error:', new Error(data.message), data);
            this.onErrorCallback(data.message);
            return;
          }

          if (data.status === 'completed') {
            logger.info('Scenario generation completed.', data.details?.result);
            const result = data.details?.result || data;
            logger.info('Calling onCompleteCallback with result:', result);
            this.onCompleteCallback(result);
            return;
          }

          this.onProgressCallback(data);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error as Error);
          this.onErrorCallback('메시지 파싱 오류가 발생했습니다.');
        }
      };

      this.ws.onerror = (event) => {
        logger.error('WebSocket error:', undefined, { event });
        this.onErrorCallback('WebSocket 연결 오류가 발생했습니다.');
      };

      this.ws.onclose = (event) => {
        logger.info('WebSocket closed:', { code: event.code, reason: event.reason });
        if (event.code !== 1000) { // 1000 is normal closure
          this.onErrorCallback('연결이 예상치 못하게 종료되었습니다.');
        }
      };
    } catch (error) {
      logger.error('Error creating WebSocket:', error as Error);
      this.onErrorCallback('WebSocket 생성 중 오류가 발생했습니다.');
    }
  }

  disconnect() {
    if (this.ws) {
      logger.info('Disconnecting WebSocket.');
      this.ws.close(1000, 'User initiated close');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * v2 WebSocket 클래스 - clientId 기반 연결
 */
export class ScenarioWebSocketV2 {
  private ws: WebSocket | null = null;
  private url: string;
  private clientId: string;
  private onProgressCallback: (progress: any) => void;
  private onErrorCallback: (message: string) => void;
  private onCompleteCallback: (result: any) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  constructor(
    clientId: string,
    wsUrl: string,
    onProgress: (progress: any) => void,
    onError: (message: string) => void,
    onComplete: (result: any) => void
  ) {
    this.clientId = clientId;
    this.url = wsUrl;
    this.onProgressCallback = onProgress;
    this.onErrorCallback = onError;
    this.onCompleteCallback = onComplete;
  }

  connect(): void {
    try {
      logger.info(`Connecting to v2 WebSocket: ${this.url}`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = (event) => {
        logger.info('v2 WebSocket connected', { url: this.url, clientId: this.clientId });
        this.reconnectAttempts = 0; // 연결 성공 시 재연결 시도 횟수 리셋
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.info('v2 WebSocket message received:', data);

          // pong 메시지는 무시
          if (data.type === 'pong') {
            return;
          }

          // 진행 상황 처리
          if (data.status) {
            this.onProgressCallback(data);

            // 완료 또는 오류 상태 처리
            if (data.status === 'completed' && data.details?.result) {
              this.onCompleteCallback(data.details.result);
            } else if (data.status === 'error') {
              this.onErrorCallback(data.message || 'Unknown error occurred');
            }
          } else {
            logger.warning('Unexpected v2 WebSocket message format:', data);
          }
        } catch (error) {
          logger.error('Error parsing v2 WebSocket message:', error as Error);
          this.onErrorCallback('메시지 파싱 중 오류가 발생했습니다.');
        }
      };

      this.ws.onerror = (event) => {
        logger.error('v2 WebSocket error:', undefined, { event, clientId: this.clientId });
        this.onErrorCallback('WebSocket 연결 오류가 발생했습니다.');
      };

      this.ws.onclose = (event) => {
        logger.info('v2 WebSocket closed:', { code: event.code, reason: event.reason, clientId: this.clientId });
        
        // 정상적인 종료가 아닌 경우 재연결 시도
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

    } catch (error) {
      logger.error('Error creating v2 WebSocket:', error as Error);
      this.onErrorCallback('WebSocket 생성 중 오류가 발생했습니다.');
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    logger.info(`Attempting v2 WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts); // 지수적 백오프
  }

  sendPing(): void {
    if (this.isConnected()) {
      try {
        this.ws?.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      } catch (error) {
        logger.error('Error sending ping:', error as Error);
      }
    }
  }

  disconnect(): void {
    logger.info('Disconnecting v2 WebSocket.');
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getClientId(): string {
    return this.clientId;
  }
}
