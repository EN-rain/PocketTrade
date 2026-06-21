interface RefreshIconButtonProps {
  loading: boolean;
  onClick: () => void;
  label?: string;
}

export function RefreshIconButton({
  loading,
  onClick,
  label = 'Refresh data',
}: RefreshIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-950 disabled:opacity-50"
    >
      <svg
        className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5m-5 4a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"
        />
      </svg>
    </button>
  );
}
