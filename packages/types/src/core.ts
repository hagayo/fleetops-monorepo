export type RobotStatus =
  | 'idle' | 'assigned' | 'en_route' | 'delivering'
  | 'returning_to_base' | 'charging' | 'maintenance' | 'failed';

export type MissionStatus =
  | 'pending' | 'assigned' | 'en_route' | 'delivering'
  | 'completed' | 'failed' | 'canceled';

export type CancelReason = 'user' | 'battery' | 'hardware' | 'blocked_path' | 'system';

export interface Position { x: number; y: number; }

export interface Robot {
  id: string;
  status: RobotStatus;
  batteryPct: number; // 0-100
  currentMissionId?: string | null;
  reassignable: boolean;
  lastError?: { code: string; message: string } | null;
  position?: Position;
  updatedAt?: string; // ISO string
}

export interface MissionHistoryItem {
  status: MissionStatus;
  at: string; // ISO string
  note?: string;
}

export interface Mission {
  id: string;
  robotId?: string | null;
  status: MissionStatus;
  cancelReason?: CancelReason | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  history?: MissionHistoryItem[];
}

export interface Stats { completed: number; failed: number; active: number; }

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field?: string; message: string; code?: string }[];
}

export type EventEnvelope =
  | { type: 'robot.updated'; ts: string; payload: Robot }
  | { type: 'mission.created' | 'mission.updated'; ts: string; payload: Mission }
  | { type: 'stats.updated'; ts: string; payload: Stats };