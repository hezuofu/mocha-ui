// ── API endpoint functions mirroring the Python backend routes ──

import { apiGet, apiPost } from './client';
import type {
  Session, Message, ModelGroup, Settings, WorkspaceEntry,
  CronJob, Skill, Profile,
} from '../types';

// ── Health ──
export const getHealth = () => apiGet<{ status: string }>('/health');
export const getAgentHealth = () => apiGet<Record<string, unknown>>('/api/health/agent');

// ── Auth ──
export const getAuthStatus = () => apiGet<{
  auth_enabled: boolean; logged_in: boolean;
  password_auth_enabled: boolean; passkeys_enabled: boolean;
}>('/api/auth/status');

export const login = (password: string) =>
  apiPost<{ success: boolean; error?: string }>('/api/auth/login', { password });

export const logout = () => apiPost('/api/auth/logout');

// ── Sessions ──
export const getSessions = () =>
  apiGet<{ sessions: Session[]; server_time?: number; server_tz?: string }>('/api/sessions');

export const getSession = (sessionId: string) =>
  apiGet<{ session: Session; messages: Message[] }>(`/api/session/${encodeURIComponent(sessionId)}`);

export const createSession = (workspace?: string) =>
  apiPost<{ session: Session }>('/api/session/new', { workspace });

export const deleteSession = (sessionId: string) =>
  apiPost('/api/session/delete', { session_id: sessionId });

export const renameSession = (sessionId: string, title: string) =>
  apiPost('/api/session/rename', { session_id: sessionId, title });

export const pinSession = (sessionId: string) =>
  apiPost('/api/session/pin', { session_id: sessionId });

export const archiveSession = (sessionId: string, archive: boolean) =>
  apiPost('/api/session/archive', { session_id: sessionId, archive });

export const duplicateSession = (sessionId: string) =>
  apiPost<{ session: Session }>('/api/session/duplicate', { session_id: sessionId });

export const searchSessions = (query: string) =>
  apiPost<{ sessions: Session[] }>('/api/sessions/search', { query });

// ── Chat ──
export const startChat = (sessionId: string, model?: string, provider?: string) =>
  apiPost<{ stream_id: string }>('/api/chat/start', {
    session_id: sessionId,
    model,
    provider,
  });

export const sendMessage = (sessionId: string, message: string, streamId: string, files?: string[]) =>
  apiPost('/api/chat/send', {
    session_id: sessionId,
    message,
    stream_id: streamId,
    files,
  });

export const cancelStream = (sessionId: string, streamId: string) =>
  apiPost('/api/chat/cancel', { session_id: sessionId, stream_id: streamId });

export const approveCommand = (sessionId: string, approvalId: string, choice: string) =>
  apiPost('/api/approval/respond', { session_id: sessionId, approval_id: approvalId, choice });

export const retryMessage = (sessionId: string, messageIndex: number) =>
  apiPost('/api/chat/retry', { session_id: sessionId, message_index: messageIndex });

export const editAndRegenerate = (sessionId: string, messageIndex: number, newContent: string) =>
  apiPost('/api/chat/edit', { session_id: sessionId, message_index: messageIndex, new_content: newContent });

// ── Models ──
export const getModels = () => apiGet<ModelGroup[]>('/api/models');
export const getLiveModels = () => apiGet<ModelGroup[]>('/api/models/live');

// ── Settings ──
export const getSettings = () => apiGet<Settings>('/api/settings');
export const saveSettings = (settings: Partial<Settings>) =>
  apiPost('/api/settings', settings);

// ── Workspace ──
export const listDir = (path: string, workspace?: string) =>
  apiPost<{ entries: WorkspaceEntry[]; path: string }>('/api/workspace/list', { path, workspace });

export const readFile = (path: string) =>
  apiPost<{ content: string; path: string; type: string }>('/api/workspace/read', { path });

export const writeFile = (path: string, content: string) =>
  apiPost('/api/workspace/write', { path, content });

export const deleteFile = (path: string) =>
  apiPost('/api/workspace/delete', { path });

export const createDir = (path: string) =>
  apiPost('/api/workspace/mkdir', { path });

export const renameFile = (oldPath: string, newPath: string) =>
  apiPost('/api/workspace/rename', { old_path: oldPath, new_path: newPath });

export const downloadFileUrl = (path: string) =>
  `/api/workspace/download?path=${encodeURIComponent(path)}`;

// ── Cron ──
export const getCrons = () => apiGet<{ jobs: CronJob[] }>('/api/crons');
export const runCronNow = (jobId: string) =>
  apiPost('/api/crons/run', { job_id: jobId });
export const createCron = (data: Partial<CronJob>) =>
  apiPost<{ job: CronJob }>('/api/crons/create', data);
export const updateCron = (jobId: string, data: Partial<CronJob>) =>
  apiPost('/api/crons/update', { job_id: jobId, ...data });
export const deleteCron = (jobId: string) =>
  apiPost('/api/crons/delete', { job_id: jobId });

// ── Skills ──
export const getSkills = () => apiGet<{ skills: Skill[] }>('/api/skills');
export const getSkillContent = (name: string) =>
  apiPost<{ name: string; content: string }>('/api/skills/content', { name });
export const saveSkill = (name: string, content: string, category?: string) =>
  apiPost('/api/skills/save', { name, content, category });
export const deleteSkill = (name: string) =>
  apiPost('/api/skills/delete', { name });
export const searchSkills = (query: string) =>
  apiPost<{ skills: Skill[] }>('/api/skills/search', { query });

// ── Memory ──
export const getMemory = () => apiGet<{ content: string }>('/api/memory');
export const saveMemory = (content: string) =>
  apiPost('/api/memory', { content });
export const getUserMemory = () => apiGet<{ content: string }>('/api/user');
export const saveUserMemory = (content: string) =>
  apiPost('/api/user', { content });

// ── Profiles ──
export const getProfiles = () => apiGet<{ profiles: Profile[] }>('/api/profiles');
export const switchProfile = (name: string) =>
  apiPost('/api/profiles/switch', { name });
export const createProfile = (name: string, baseUrl?: string, apiKey?: string) =>
  apiPost('/api/profiles/create', { name, base_url: baseUrl, api_key: apiKey });
export const deleteProfile = (name: string) =>
  apiPost('/api/profiles/delete', { name });

// ── Onboarding ──
export const getOnboardingStatus = () =>
  apiGet<{ needs_onboarding: boolean; stage?: string }>('/api/onboarding/status');
export const submitOnboarding = (data: Record<string, unknown>) =>
  apiPost('/api/onboarding/submit', data);

// ── Logs ──
export const getLogs = (file: string, tail: number) =>
  apiGet<{ lines: string[] }>(`/api/logs?file=${encodeURIComponent(file)}&tail=${encodeURIComponent(tail)}`);

// ── Insights ──
export const getInsights = (period?: number) =>
  apiGet<Record<string, unknown>>(`/api/insights${period ? `?days=${period}` : ''}`);

// ── Misc ──
export const getCompressStatus = (sessionId: string) =>
  apiGet(`/api/compress/status?session_id=${encodeURIComponent(sessionId)}`);

export const clearConversation = (sessionId: string) =>
  apiPost('/api/conversation/clear', { session_id: sessionId });

export const exportSession = (sessionId: string, format: 'markdown' | 'json' = 'json') =>
  apiPost<{ data: string }>('/api/session/export', { session_id: sessionId, format });

export const importSession = (data: string) =>
  apiPost<{ session: Session }>('/api/session/import', { data });

export const getVersion = () => apiGet<{ version: string }>('/api/version');

export const getProjects = () => apiGet('/api/projects');
export const createProject = (name: string, color?: string) =>
  apiPost('/api/projects/create', { name, color });
export const deleteProject = (projectId: string) =>
  apiPost('/api/projects/delete', { project_id: projectId });
export const moveToProject = (sessionId: string, projectId: string | null) =>
  apiPost('/api/session/move-project', { session_id: sessionId, project_id: projectId });
