"use client";

import { COLOR_SCHEMES } from "@/lib/colorSchemes";
import type { ColorSchemeId } from "@/lib/types";
import { cn } from "@/lib/cn";

export function ColorSchemePicker({
  value,
  onChange,
}: {
  value: ColorSchemeId;
  onChange: (id: ColorSchemeId) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-text-primary">
        Color scheme
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {COLOR_SCHEMES.map((scheme) => {
          const active = scheme.id === value;
          return (
            <button
              key={scheme.id}
              type="button"
              onClick={() => onChange(scheme.id)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-2.5 text-left cursor-pointer transition-colors",
                active
                  ? "border-button ring-2 ring-button/40 bg-background"
                  : "border-card-border hover:bg-background"
              )}
            >
              <span className="flex" aria-hidden="true">
                {scheme.swatch.map((c, i) => (
                  <span
                    key={i}
                    className="h-6 w-4 rounded-sm border border-black/5 first:rounded-l-md last:rounded-r-md"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {scheme.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
