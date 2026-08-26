interface ToolbarButtonProps {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  glyphClassName: string;
  children: string;
}

export default function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  glyphClassName,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${glyphClassName} ${
        active ? 'bg-[#c8a96e]/20 text-[#c8a96e]' : 'text-[#c8b8e8] hover:bg-white/8 hover:text-[#f0eaf8]'
      }`}
    >
      {children}
    </button>
  );
}
