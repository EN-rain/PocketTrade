type ActionIcon = 'approve' | 'reject' | 'edit' | 'remove' | 'restore' | 'suspend';

interface ActionIconButtonProps {
  icon: ActionIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'neutral';
}

const paths: Record<ActionIcon, React.ReactNode> = {
  approve: <path d="m5 12 4 4L19 6" />,
  reject: <path d="M6 6l12 12M18 6 6 18" />,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  remove: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="m6 7 1 14h10l1-14M9 7V4h6v3" /></>,
  restore: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
  suspend: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>,
};

export function ActionIconButton({
  icon,
  label,
  onClick,
  disabled = false,
  tone = 'neutral',
}: ActionIconButtonProps) {
  const toneClasses = tone === 'primary'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses}`}
    >
      <svg
        className="h-4.5 w-4.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {paths[icon]}
      </svg>
    </button>
  );
}
