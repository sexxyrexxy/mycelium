"use client";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/80 px-10 py-12 shadow-lg">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/40 border-t-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading mushroom dashboard…
        </p>
      </div>
    </div>
  );
}
