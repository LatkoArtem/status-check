export default function CalendarPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Календар</h1>
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          + Нове зобов'язання
        </button>
      </div>
      <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
        <p className="text-muted-foreground">
          FullCalendar — реалізується у Phase 4
        </p>
      </div>
    </div>
  );
}
