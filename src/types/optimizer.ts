export interface Scorecards {
  total_sleep_hours: number;
  total_study_hours: number;
  total_social_hours: number;
  gym_sessions_count: number;
  batch_cooking_sessions: number;
}

export interface SafetyChecks {
  locked_blocks_respected: boolean;
  cannabis_buffer_respected: boolean;
  friend_availability_respected: boolean;
  all_shifts_covered: boolean;
}

export interface ChangeLocationPayload {
  start_time: string;
  end_time: string;
  location: string;
  location_detail?: string;
}

export interface ScheduleChange {
  action: 'modify' | 'create' | 'delete';
  event_id: string;
  title: string;
  category: string;
  contact_name?: string;
  before: ChangeLocationPayload | null;
  after: ChangeLocationPayload | null;
  reason: string;
  applied?: boolean;
}

export interface StageLog {
  stage_number: number;
  name: string;
  description: string;
  prompt_sent: string;
  raw_response: string;
  latency_ms: number;
  status: 'success' | 'fallback' | 'skipped' | 'error';
  error_message?: string;
}

export interface ExecutionLogs {
  provider: 'gemini-1.5-flash' | 'heuristic_fallback';
  model_name: string;
  api_key_source: 'body' | 'header' | 'env' | 'none';
  total_latency_ms: number;
  timestamp: string;
  stages: StageLog[];
  overall_system_prompt?: string;
  user_payload_preview?: string;
  error_details?: string | null;
}

export interface OptimizerResponse {
  summary: string;
  scorecards: Scorecards;
  safety_checks: SafetyChecks;
  changes: ScheduleChange[];
  warnings: string[];
  execution_logs?: ExecutionLogs;
}
