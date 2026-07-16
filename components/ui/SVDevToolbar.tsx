'use client';

type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export default function SVDevToolbar<T extends string>({
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <div className="sv-dev-toolbar">
      <span>{label}</span>

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}