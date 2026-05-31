const LOCALE_KEY = 'hermes-language';

const messages: Record<string, Record<string, string>> = {
  en: {
    tab_chat: 'Chat', tab_tasks: 'Tasks', tab_kanban: 'Kanban', tab_skills: 'Skills',
    tab_memory: 'Memory', tab_workspaces: 'Spaces', tab_profiles: 'Profiles',
    tab_todos: 'Todos', tab_insights: 'Insights', tab_logs: 'Logs', tab_settings: 'Settings',
    new_conversation: 'New conversation', scheduled_jobs: 'Scheduled jobs',
    filter_conversations: 'Filter conversations...', search_skills: 'Search skills...',
    empty_title: 'What can I help with?', empty_subtitle: 'Ask anything, run commands, explore files.',
    suggest_files: 'What files are in this workspace?', suggest_schedule: "What's on my schedule today?",
    suggest_plan: 'Help me plan a small project.', loading: 'Loading...',
    no_conversations: 'No conversations yet', start_new: 'Start a new conversation to begin',
    approve_once: 'Allow once', approve_session: 'Allow session', approve_always: 'Always allow',
    approve_deny: 'Deny', approve_skip: 'Skip all', approval_required: 'Approval required',
    message_placeholder: 'Message Hermes…', offline_title: 'Connection lost',
    offline_detail: 'Your browser is offline.', reconnect_detail: 'Connection restored.',
    agent_health_title: 'Agent not responding', sign_out: 'Sign out', reload: 'Reload',
    export_md: 'Export MD', export_json: 'Export JSON', import_json: 'Import JSON',
    clear_conversation: 'Clear', rename: 'Rename', duplicate: 'Duplicate', delete: 'Delete',
    archive: 'Archive', unarchive: 'Unarchive', pin: 'Pin', unpin: 'Unpin',
    copy_session_id: 'Copy session ID', settings_conversation: 'Conversation',
    settings_appearance: 'Appearance', settings_preferences: 'Preferences',
    settings_providers: 'Providers', settings_plugins: 'Plugins', settings_system: 'System',
  },
  zh: {
    tab_chat: '对话', tab_tasks: '任务', tab_kanban: '看板', tab_skills: '技能',
    tab_memory: '记忆', tab_workspaces: '空间', tab_profiles: '配置',
    tab_todos: '待办', tab_insights: '洞察', tab_logs: '日志', tab_settings: '设置',
    new_conversation: '新建对话', scheduled_jobs: '定时任务',
    filter_conversations: '筛选对话...', search_skills: '搜索技能...',
    empty_title: '需要我帮忙吗？', empty_subtitle: '随心提问，运行命令，浏览文件。',
    suggest_files: '工作区里有什么文件？', suggest_schedule: '今天我有什么安排？',
    suggest_plan: '帮我规划一个小项目。', loading: '加载中...',
    no_conversations: '暂无对话', start_new: '新建对话开始',
    approve_once: '允许本次', approve_session: '允许会话', approve_always: '始终允许',
    approve_deny: '拒绝', approve_skip: '跳过全部', approval_required: '需要批准',
    message_placeholder: '给 Hermes 发消息…', offline_title: '连接断开',
    sign_out: '退出登录', reload: '重新加载',
    rename: '重命名', duplicate: '复制', delete: '删除', archive: '归档', unarchive: '取消归档',
    settings_conversation: '对话', settings_appearance: '外观', settings_preferences: '偏好',
    settings_providers: '提供商', settings_plugins: '插件', settings_system: '系统',
  },
};

export function t(key: string): string {
  try {
    const lang = localStorage.getItem(LOCALE_KEY) || 'en';
    return messages[lang]?.[key] || messages.en[key] || key;
  } catch { return key; }
}

export function setLocale(lang: string) {
  localStorage.setItem(LOCALE_KEY, lang);
}

export function getLocale(): string {
  try { return localStorage.getItem(LOCALE_KEY) || 'en'; } catch { return 'en'; }
}
