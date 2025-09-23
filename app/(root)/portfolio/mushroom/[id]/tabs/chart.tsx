// app/portfolio/mushroom/[id]/tabs/chart.tsx
"use client";
import { useParams } from "next/navigation";
import RealTimeChart from "@/components/portfolio/RealTimeChart";

export default function Chart() {
  const { id } = useParams<{ id: string }>();
  const mushId = id; 

  return <RealTimeChart mushId={mushId} height={420} />;
}
