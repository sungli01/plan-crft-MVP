export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

export interface Project {
  id: string;
  title: string;
  idea: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  model?: string;
  createdAt: string;
  updatedAt?: string;
  errorMessage?: string;
}

export interface Document {
  id: string;
  qualityScore: number;
  sectionCount: number;
  wordCount: number;
  imageCount: number;
  createdAt: string;
}

export interface AgentProgress {
  status: 'pending' | 'running' | 'completed';
  progress: number;
  detail: string;
  currentSection?: number;
  totalSections?: number;
}

export interface ProgressLog {
  timestamp: number;
  time: string;
  agent: string;
  level: string;
  message: string;
}

export interface RealtimeProgress {
  phase: string;
  agents: Record<string, AgentProgress>;
  logs: ProgressLog[];
  overallProgress: number;
  startedAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  type: 'user' | 'system';
  content: string;
  timestamp: Date;
}
