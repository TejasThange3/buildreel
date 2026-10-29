"use client";

import { useId } from "react";

type SegmentedProps<T extends string | number> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  mono?: boolean;
};

// Native radios under one name, so the group is one tab stop and arrow keys move the choice.
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
  mono,
}: SegmentedProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-full bg-surface p-1 outline outline-1 -outline-offset-1 outline-line"
    >
      {options.map((option) => (
        <label
          key={option.value}
          data-mono={mono}
          className="flex h-8 cursor-pointer items-center rounded-full px-3.5 text-xs text-fg-muted transition-colors hover:text-fg has-[:checked]:bg-fg has-[:checked]:text-canvas has-[:disabled]:cursor-default has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg data-[mono=true]:font-mono data-[mono=true]:tabular-nums"
        >
          <input
            type="radio"
            name={name}
            checked={option.value === value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
