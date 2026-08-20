"use client";

import { FONT_THEMES } from "@/lib/fontThemes";
import type { FontThemeId } from "@/lib/types";
import { cn } from "@/lib/cn";

export function FontThemePicker({
  value,
  onChange,
}: {
  value: FontThemeId;
  onChange: (id: FontThemeId) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-text-primary">
        Font theme
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FONT_THEMES.map((theme) => {
          const active = theme.id === (value ?? "system");
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              aria-pressed={active}
              title={theme.description}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-3 text-left cursor-pointer transition-colors",
                active
                  ? "border-button ring-2 ring-button/40 bg-background"
                  : "border-card-border hover:bg-background"
              )}
            >
              <span
                className="text-2xl leading-none text-text-primary"
                style={{ fontFamily: theme.cssVar ?? undefined }}
                aria-hidden="true"
              >
                Party
              </span>
              <span className="text-sm font-medium text-text-primary">
                {theme.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
