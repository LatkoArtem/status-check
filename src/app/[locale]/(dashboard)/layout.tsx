export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — реалізується у Phase 4 */}
      <aside className="w-60 shrink-0 border-r border-border bg-card" />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
