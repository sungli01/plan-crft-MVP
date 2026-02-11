/**
 * Progress Tracker
 * 프로젝트 생성 진행 상황을 메모리에 저장하고 추적
 */

export interface AgentProgress {
  status: string;
  progress: number;
  detail: string;
  currentSection?: number | null;
  totalSections?: number;
  updatedAt?: number;
}

export interface ProgressLog {
  timestamp: number;
  time: string;
  agent: string;
  level: string;
  message: string;
}

export interface ProjectProgress {
  phase: string;
  agents: Record<string, AgentProgress>;
  logs: ProgressLog[];
  startedAt: number;
  updatedAt: number;
  estimatedMinutes?: number; // 예상 완료 시간 (분)
  estimatedEndTime?: number; // 예상 완료 시각 (timestamp)
}

class ProgressTracker {
  progressMap: Map<string, ProjectProgress>;

  constructor() {
    this.progressMap = new Map();
  }

  init(projectId: string): void {
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

  updateAgent(projectId: string, agentName: string, data: Partial<AgentProgress>): void {
    const progress = this.progressMap.get(projectId);
    if (!progress) return;

    if (progress.agents[agentName]) {
      progress.agents[agentName] = {
        ...progress.agents[agentName],
        ...data,
        updatedAt: Date.now()
      };
      progress.updatedAt = Date.now();
    }
  }

  addLog(projectId: string, log: { agent: string; level: string; message: string }): void {
    const progress = this.progressMap.get(projectId);
    if (!progress) return;

    progress.logs.push({
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      ...log
    });

    if (progress.logs.length > 100) {
      progress.logs = progress.logs.slice(-100);
    }

    progress.updatedAt = Date.now();
  }

  updatePhase(projectId: string, phase: string): void {
    const progress = this.progressMap.get(projectId);
    if (!progress) return;

    progress.phase = phase;
    progress.updatedAt = Date.now();
  }

  get(projectId: string): ProjectProgress | undefined {
    return this.progressMap.get(projectId);
  }

  clear(projectId: string): void {
    this.progressMap.delete(projectId);
  }

  calculateOverallProgress(projectId: string): number {
    const progress = this.progressMap.get(projectId);
    if (!progress) return 0;

    const agents = Object.values(progress.agents);
    const totalProgress = agents.reduce((sum, agent) => sum + agent.progress, 0);
    return Math.round(totalProgress / agents.length);
  }

  setEstimatedTime(projectId: string, sectionCount: number): void {
    const progress = this.progressMap.get(projectId);
    if (!progress) return;

    // 예상 시간 계산: 섹션당 약 30초 + 고정 오버헤드 3분
    const estimatedMinutes = Math.ceil((sectionCount * 0.5) + 3);
    const estimatedEndTime = Date.now() + (estimatedMinutes * 60 * 1000);

    progress.estimatedMinutes = estimatedMinutes;
    progress.estimatedEndTime = estimatedEndTime;
    progress.updatedAt = Date.now();
  }

  getRemainingTime(projectId: string): number | null {
    const progress = this.progressMap.get(projectId);
    if (!progress || !progress.estimatedEndTime) return null;

    const remaining = Math.max(0, progress.estimatedEndTime - Date.now());
    return Math.ceil(remaining / (60 * 1000)); // 분 단위로 반환
  }
}

// Singleton
export const progressTracker = new ProgressTracker();
