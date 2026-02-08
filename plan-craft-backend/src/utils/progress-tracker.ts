/**
 * Progress Tracker
 * 프로젝트 생성 진행 상황을 메모리에 저장하고 추적
 * WebSocket을 통해 실시간으로 클라이언트에 브로드캐스트
 */

import { broadcastProgress } from '../ws/progress-ws';

class ProgressTracker {
  constructor() {
    // projectId -> progress 매핑
    this.progressMap = new Map();
  }

  /**
   * 진행 상황 초기화
   */
  init(projectId) {
    this.progressMap.set(projectId, {
      phase: 'initializing',
      agents: {
        architect: { status: 'pending', progress: 0, detail: '대기 중' },
        writer: { status: 'pending', progress: 0, detail: '대기 중', currentSection: null, totalSections: 0 },
        imageCurator: { status: 'pending', progress: 0, detail: '대기 중' },
        reviewer: { status: 'pending', progress: 0, detail: '대기 중' }
      },
      logs: [],
      startedAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  /**
   * 에이전트 상태 업데이트
   */
  updateAgent(projectId, agentName, data) {
    const progress = this.progressMap.get(projectId);
    if (!progress) return;

    if (progress.agents[agentName]) {
      progress.agents[agentName] = {
        ...progress.agents[agentName],
        ...data,
        updatedAt: Date.now()
      };
      progress.updatedAt = Date.now();

      // Broadcast to WebSocket clients
      broadcastProgress(projectId, {
        type: 'agent_update',
        phase: progress.phase,
        agents: progress.agents,
        overallProgress: this.calculateOverallProgress(projectId),
        updatedAt: progress.updatedAt
      });
    }
  }

  /**
   * 로그 추가
   */
  addLog(projectId, log) {
    const progress = this.progressMap.get(projectId);
    if (!progress) return;

    progress.logs.push({
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      ...log
    });

    // 최근 100개만 유지
    if (progress.logs.length > 100) {
      progress.logs = progress.logs.slice(-100);
    }

    progress.updatedAt = Date.now();

    // Broadcast log to WebSocket clients
    broadcastProgress(projectId, {
      type: 'log',
      log: progress.logs[progress.logs.length - 1],
      phase: progress.phase,
      overallProgress: this.calculateOverallProgress(projectId),
      updatedAt: progress.updatedAt
    });
  }

  /**
   * Phase 업데이트
   */
  updatePhase(projectId, phase) {
    const progress = this.progressMap.get(projectId);
    if (!progress) return;

    progress.phase = phase;
    progress.updatedAt = Date.now();

    // Broadcast phase change to WebSocket clients
    broadcastProgress(projectId, {
      type: 'phase_update',
      phase: progress.phase,
      agents: progress.agents,
      overallProgress: this.calculateOverallProgress(projectId),
      updatedAt: progress.updatedAt
    });
  }

  /**
   * 진행 상황 조회
   */
  get(projectId) {
    return this.progressMap.get(projectId);
  }

  /**
   * 진행 상황 삭제 (완료/실패 시)
   */
  clear(projectId) {
    this.progressMap.delete(projectId);
  }

  /**
   * 전체 진행률 계산
   */
  calculateOverallProgress(projectId) {
    const progress = this.progressMap.get(projectId);
    if (!progress) return 0;

    const agents = Object.values(progress.agents);
    const totalProgress = agents.reduce((sum, agent) => sum + agent.progress, 0);
    return Math.round(totalProgress / agents.length);
  }
}

// Singleton
export const progressTracker = new ProgressTracker();
