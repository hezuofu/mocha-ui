// ── Core domain types shared across the app ──

export interface Session {
  session_id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
  workspace: string;
  profile?: string;
  project_id?: string | null;
  pinned?: boolean;
  archived?: boolean;
  source?: 'webui' | 'cli' | 'cron' | 'messaging';
  model?: string;
  active_stream_id?: string | null;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  timestamp?: number;
  reasoning?: string;
  thinking?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
  result?: string;
  status?: 'pending' | 'running' | 'done' | 'error';
}

export interface ModelInfo {
  name: string;
  provider: string;
  display_name: string;
  context_window?: number;
  reasoning?: boolean;
}

export interface ModelGroup {
  provider: string;
  label: string;
  models: ModelInfo[];
}

export interface Settings {
  model?: string;
  theme?: 'system' | 'dark' | 'light';
  skin?: string;
  language?: string;
  font_size?: 'default' | 'small' | 'large' | 'xlarge';
  send_key?: 'enter' | 'ctrl_enter';
  token_display?: boolean;
  show_cli_sessions?: boolean;
  busy_input_mode?: 'queue' | 'interrupt' | 'steer';
  default_workspace?: string;
  bot_name?: string;
}

export interface WorkspaceEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  schedule?: string;
  schedule_display?: string;
  active?: boolean;
  next_run?: number;
  next_run_at?: number;
  last_run?: number;
  last_run_at?: number;
  agent?: string;
  prompt?: string;
  last_error?: string;
  skills?: string[];
  deliver?: string;
  provider?: string;
  model?: string;
  profile?: string;
  no_agent?: boolean;
  script?: string;
  toast_notifications?: boolean;
}

export interface Skill {
  name: string;
  category: string;
  description: string;
  content?: string;
}

export interface Profile {
  name: string;
  path?: string;
  is_default?: boolean;
  is_active?: boolean;
  gateway_running?: boolean;
  model?: string | null;
  provider?: string | null;
  has_env?: boolean;
  skill_count?: number;
}

export interface ProfilesResponse {
  profiles: Profile[];
  active: string;
}

export interface SSEEvent {
  type: 'token' | 'done' | 'error' | 'tool_call' | 'approval' | 'thinking' | 'status';
  data: Record<string, unknown>;
}

export interface AppError {
  type: 'model_not_found' | 'auth' | 'network' | 'timeout' | 'cancelled' | 'provider' | 'unknown';
  message: string;
  details?: string;
}
