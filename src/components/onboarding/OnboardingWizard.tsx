import { useState, useEffect } from 'react';
import { getOnboardingStatus, submitOnboarding } from '../../api/endpoints';

interface Step {
  key: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { key: 'welcome', title: 'Welcome to Hermes', description: 'Your AI agent workspace. Let\'s get you set up in a few quick steps.' },
  { key: 'workspace', title: 'Workspace', description: 'Choose where Hermes can read and write files on your machine.' },
  { key: 'providers', title: 'AI Providers', description: 'Configure at least one model provider to enable chat.' },
  { key: 'password', title: 'Security', description: 'Set a password to protect your Hermes instance (optional).' },
  { key: 'done', title: 'You\'re all set!', description: 'Hermes is ready. Start a conversation and explore.' },
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState('');
  const data: Record<string, unknown> = {};

  useEffect(() => {
    getOnboardingStatus().then(s => {
      if (!s.needs_onboarding) setStep(-1);
      else if (s.stage) {
        const idx = STEPS.findIndex(st => st.key === s.stage);
        if (idx >= 0) setStep(idx);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleNext = async () => {
    if (step === 1 && workspace) data.workspace = workspace;
    const next = step + 1;
    if (next >= STEPS.length) {
      await submitOnboarding(data);
      setStep(-1);
      return;
    }
    await submitOnboarding({ ...data, stage: STEPS[next].key });
    setStep(next);
  };

  const handleSkip = () => handleNext();

  if (loading) return null;
  if (step < 0) return null;

  const current = STEPS[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1500, display: 'flex',
      background: 'var(--bg)', color: 'var(--text)',
    }}>
      {/* Sidebar */}
      <div style={{
        width: 240, background: 'var(--sidebar)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: 24, gap: 8, flexShrink: 0,
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'var(--accent)' }}>Hermes</div>
        {STEPS.map((s, i) => (
          <div key={s.key} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            borderRadius: 8, fontSize: 13,
            background: i === step ? 'var(--accent-bg)' : 'transparent',
            color: i === step ? 'var(--accent-text)' : i < step ? 'var(--success)' : 'var(--muted)',
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < step ? 'var(--success)' : i === step ? 'var(--accent)' : 'var(--border)',
              color: '#fff', fontSize: 11, fontWeight: 700,
            }}>
              {i < step ? '✓' : i + 1}
            </span>
            {s.title}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 24px',
            background: 'linear-gradient(145deg, var(--accent-bg), var(--accent-bg))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: 'var(--accent-text)', fontWeight: 700,
          }}>
            {step + 1}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{current.title}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>{current.description}</p>

          {/* Step-specific content */}
          {step === 1 && (
            <input
              value={workspace}
              onChange={e => setWorkspace(e.target.value)}
              placeholder="e.g. /home/user/projects"
              style={{
                width: '100%', padding: '12px 16px', border: '1px solid var(--accent)', borderRadius: 12,
                background: 'var(--bg)', color: 'var(--text)', fontSize: 16, outline: 'none',
                marginBottom: 24, textAlign: 'center',
              }}
              autoFocus
            />
          )}

          {step === 2 && (
            <div style={{ marginBottom: 24, color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
              <p>Providers are configured via environment variables or <code style={{ background: 'var(--code-bg)', padding: '2px 6px', borderRadius: 4 }}>config.yaml</code>.</p>
              <p style={{ marginTop: 8 }}>You can add API keys later in Settings → Providers.</p>
            </div>
          )}

          {step === 3 && (
            <input
              type="password"
              placeholder="Set a password (leave empty to skip)"
              onChange={e => { data.password = e.target.value; }}
              style={{
                width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 12,
                background: 'var(--bg)', color: 'var(--text)', fontSize: 16, outline: 'none',
                marginBottom: 24, textAlign: 'center',
              }}
            />
          )}

          {step === 4 && (
            <div style={{ marginBottom: 24, color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
              <p>You can now:</p>
              <ul style={{ textAlign: 'left', marginTop: 8, paddingLeft: 20 }}>
                <li>Start a conversation with the AI</li>
                <li>Browse and manage files in the workspace panel</li>
                <li>Create scheduled cron jobs</li>
                <li>Manage multiple agent profiles</li>
                <li>Configure themes, skins, and preferences</li>
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                style={{ padding: '12px 24px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Back
              </button>
            )}
            <button onClick={handleNext}
              style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {step >= STEPS.length - 1 ? 'Finish' : 'Continue'}
            </button>
            {step > 0 && step < STEPS.length - 1 && (
              <button onClick={handleSkip}
                style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }}>
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
