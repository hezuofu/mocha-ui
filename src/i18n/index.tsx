import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const LOCALE_KEY = 'hermes-language';

const messages: Record<string, Record<string, string>> = {
  en: {
    tab_chat:'Chat',tab_tasks:'Tasks',tab_kanban:'Kanban',tab_skills:'Skills',
    tab_memory:'Memory',tab_workspaces:'Spaces',tab_profiles:'Profiles',
    tab_todos:'Todos',tab_insights:'Insights',tab_logs:'Logs',tab_settings:'Settings',
    new_conversation:'New conversation',scheduled_jobs:'Scheduled jobs',
    filter_conversations:'Filter conversations...',search_skills:'Search skills...',
    empty_title:"What can I help with?",empty_subtitle:'Ask anything, run commands, explore files.',
    suggest_files:'What files are in this workspace?',suggest_schedule:"What's on my schedule today?",
    suggest_plan:'Help me plan a small project.',loading:'Loading...',
    no_conversations:'No conversations yet',start_new:'Start a new conversation to begin',
    approve_once:'Allow once',approve_session:'Allow session',approve_always:'Always allow',
    approve_deny:'Deny',approve_skip:'Skip all',approval_required:'Approval required',
    message_placeholder:'Message Hermes...',offline_title:'Connection lost',
    sign_out:'Sign out',reload:'Reload',rename:'Rename',duplicate:'Duplicate',
    delete:'Delete',archive:'Archive',unarchive:'Unarchive',pin:'Pin',unpin:'Unpin',
    copy_session_id:'Copy session ID',copy:'Copy',retry:'Retry',edit:'Edit',
    settings_conversation:'Conversation',settings_appearance:'Appearance',
    settings_preferences:'Preferences',settings_providers:'Providers',
    settings_plugins:'Plugins',settings_system:'System',
    today:'Today',yesterday:'Yesterday',earlier:'Earlier',
    all:'All',webui:'WebUI',cli:'CLI',msg:'Msg',show_archived:'Show archived',
    think:'Think',tools:'Tools',workspace:'workspace',default:'default',
    send:'Send',cancel:'Cancel',save:'Save',clear:'Clear',
    download:'Download',export_json:'Export JSON',clear_conversation:'Clear',
    language:'Language',theme:'Theme',skin:'Skin',font_size:'Font Size',
    dark:'Dark',light:'Light',system:'System',
    files:'Files',artifacts:'Artifacts',preview:'Preview',copy_path:'Copy path',
    close:'Close',new_file:'New file',new_folder:'New folder',empty_directory:'Empty directory',
    generating:'Generating response...',
    connection_lost:'Connection lost',connection_restored:'Connection restored',
    agent_not_responding:'Agent not responding',dismiss:'Dismiss',
    voice_mode:'Voice mode active',listening:'Listening...',
    quota_ok:'Quota OK',yolo:'YOLO',streaming:'Streaming...',
    password:'Password',stop_server:'Stop server',save_settings:'Save Settings',
    check_updates:'Check for updates',register_passkey:'Register Passkey',
    no_providers:'No providers configured',no_plugins:'No plugins installed',
    bot_name:'Bot Name',send_key:'Send Key',busy_input_mode:'Busy Input Mode',
    token_display:'Show token count',show_cli_sessions:'Show CLI sessions',
    active_conversation:'Active Conversation',export_md:'Export MD',
    import_json:'Import JSON',actions:'Actions',reload_app:'Reload App',
    new_task:'New task...',no_tasks:'No tasks yet',no_artifacts:'No artifacts yet',
    model_providers:'Model Providers',add_api_key:'Add API Key',
    installed_plugins:'Installed Plugins',versions:'Versions',
    gateway:'Gateway',mcp_servers:'MCP Servers',passkeys:'Passkeys',
    access_password:'Access Password',sidebar_tabs:'Sidebar Tabs',
    current_task_list:'Current task list',personal_memory:'Personal memory',
    insights_title:'Usage Analytics',choose_log_file:'Choose a log file to view recent lines.',
  },
  zh: {
    tab_chat:'对话',tab_tasks:'任务',tab_kanban:'看板',tab_skills:'技能',
    tab_memory:'记忆',tab_workspaces:'空间',tab_profiles:'配置',
    tab_todos:'待办',tab_insights:'洞察',tab_logs:'日志',tab_settings:'设置',
    new_conversation:'新建对话',scheduled_jobs:'定时任务',
    filter_conversations:'筛选对话...',search_skills:'搜索技能...',
    empty_title:'需要我帮忙吗？',empty_subtitle:'随心提问，运行命令，浏览文件。',
    suggest_files:'工作区里有什么文件？',suggest_schedule:'今天我有什么安排？',
    suggest_plan:'帮我规划一个小项目。',loading:'加载中...',
    no_conversations:'暂无对话',start_new:'新建对话开始',
    approve_once:'允许本次',approve_session:'允许会话',approve_always:'始终允许',
    approve_deny:'拒绝',approve_skip:'跳过全部',approval_required:'需要批准',
    message_placeholder:'给 Hermes 发消息...',offline_title:'连接断开',
    sign_out:'退出登录',reload:'重新加载',rename:'重命名',duplicate:'复制',
    delete:'删除',archive:'归档',unarchive:'取消归档',pin:'固定',unpin:'取消固定',
    copy_session_id:'复制会话ID',copy:'复制',retry:'重试',edit:'编辑',
    settings_conversation:'对话',settings_appearance:'外观',
    settings_preferences:'偏好',settings_providers:'提供商',
    settings_plugins:'插件',settings_system:'系统',
    today:'今天',yesterday:'昨天',earlier:'更早',
    all:'全部',webui:'网页',cli:'命令行',msg:'消息',show_archived:'显示已归档',
    think:'思考',tools:'工具',workspace:'工作区',default:'默认',
    send:'发送',cancel:'取消',save:'保存',clear:'清空',
    download:'下载',export_json:'导出JSON',clear_conversation:'清空对话',
    language:'语言',theme:'主题',skin:'皮肤',font_size:'字体大小',
    dark:'暗色',light:'亮色',system:'系统',
    files:'文件',artifacts:'工件',preview:'预览',copy_path:'复制路径',
    close:'关闭',new_file:'新建文件',new_folder:'新建文件夹',empty_directory:'空目录',
    generating:'正在生成回复...',
    connection_lost:'连接断开',connection_restored:'连接已恢复',
    agent_not_responding:'Agent 无响应',dismiss:'忽略',
    voice_mode:'语音模式已激活',listening:'正在聆听...',
    quota_ok:'配额正常',yolo:'自动批准',streaming:'生成中...',
    password:'密码',stop_server:'停止服务器',save_settings:'保存设置',
    check_updates:'检查更新',register_passkey:'注册通行密钥',
    no_providers:'未配置提供商',no_plugins:'未安装插件',
    bot_name:'机器人名称',send_key:'发送键',busy_input_mode:'忙碌输入模式',
    token_display:'显示令牌数',show_cli_sessions:'显示CLI会话',
    active_conversation:'活跃对话',export_md:'导出MD',
    import_json:'导入JSON',actions:'操作',reload_app:'重载应用',
    new_task:'新建任务...',no_tasks:'暂无任务',no_artifacts:'暂无工件',
    model_providers:'模型提供商',add_api_key:'添加API密钥',
    installed_plugins:'已安装插件',versions:'版本',
    gateway:'网关',mcp_servers:'MCP服务器',passkeys:'通行密钥',
    access_password:'访问密码',sidebar_tabs:'侧边栏标签',
    current_task_list:'当前任务列表',personal_memory:'个人记忆',
    insights_title:'使用分析',choose_log_file:'选择日志文件查看最近行。',
  },
};

function loadLocale(): string { try { return localStorage.getItem(LOCALE_KEY) || 'en'; } catch { return 'en'; } }

interface I18nContextType { locale: string; t: (key: string) => string; setLocale: (l: string) => void; }
const I18nContext = createContext<I18nContextType>({ locale: 'en', t: (k) => k, setLocale: () => {} });
export function useI18n() { return useContext(I18nContext); }

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(loadLocale);
  const t = useCallback((key: string): string => {
    try { return messages[locale]?.[key] || messages.en[key] || key; }
    catch { return key; }
  }, [locale]);
  const setLocale = useCallback((lang: string) => {
    localStorage.setItem(LOCALE_KEY, lang); setLocaleState(lang);
  }, []);
  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>;
}
