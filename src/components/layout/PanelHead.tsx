import type { ReactNode } from 'react';

interface PanelHeadProps {
  title: string;
  actions?: ReactNode;
}

export default function PanelHead({ title, actions }: PanelHeadProps) {
  return (
    <div className="panel-head">
      <span>{title}</span>
      {actions && <div className="panel-head-actions">{actions}</div>}
    </div>
  );
}
