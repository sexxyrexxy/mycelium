"use client";

import { Button } from "@/components/ui/button";
import {
  TIMELINE_OPTIONS,
  TimelineRange,
} from "@/hooks/useMushroomSignals";
import { Loader2 } from "lucide-react";

type Props = {
  value: TimelineRange;
  onChange: (next: TimelineRange) => void;
  options?: typeof TIMELINE_OPTIONS;
  disabledMap?: Partial<Record<TimelineRange, boolean>>;
  className?: string;
  pendingId?: TimelineRange | null;
};

export function SignalTimeRangeSelector({
  value,
  onChange,
  options = TIMELINE_OPTIONS,
  disabledMap,
  className,
  pendingId,
}: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {options.map((opt) => {
        const active = opt.id === value;
        const disabled = Boolean(disabledMap?.[opt.id]);
        const isPending = pendingId === opt.id;

        return (
          <Button
            key={opt.id}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            disabled={disabled || isPending}
            onClick={() => {
              if (!active && !disabled && !isPending) onChange(opt.id);
            }}
            className={`transition ${active ? "shadow-md" : ""}`}
          >
            {isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : null}
            <span>{opt.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
