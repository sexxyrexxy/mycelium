// app/portfolio/mushroom/[id]/tabs/chart.tsx
"use client";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import RealTimeChart from "@/components/portfolio/RealTimeChart";

export default function Chart() {
  const { id } = useParams<{ id: string }>();
  const mushId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [id]);

  return <RealTimeChart mushId={mushId} height={420} />;
}
