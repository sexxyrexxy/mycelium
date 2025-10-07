"use client";

import { Button } from "@/components/ui/button";
import { TIMELINE_OPTIONS, TimelineRange } from "@/hooks/useMushroomSignals";
import { Loader2 } from "lucide-react";
import { useRef } from "react";

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
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;
    container.style.cursor = "grabbing";
  };

  const onMouseLeaveOrUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    isDraggingRef.current = false;
    container.style.cursor = "grab";
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const container = e.currentTarget;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    container.scrollLeft = scrollLeftRef.current - walk;
  };

  return (
    <div
      className={`no-scrollbar flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] ${
        className ?? ""
      }`}
      style={{ scrollbarWidth: "none" }}
      onWheel={(e) => {
        if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
          e.currentTarget.scrollBy({ left: e.deltaY, behavior: "smooth" });
          e.preventDefault();
        }
      }}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeaveOrUp}
      onMouseUp={onMouseLeaveOrUp}
      onMouseMove={onMouseMove}
    >
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
            className={`shrink-0 transition whitespace-nowrap ${
              active ? "shadow-md" : ""
            }`}
          >
            {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
            <span>{opt.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
