import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { RefreshDataButton } from "@/components/ui/RefreshDataButton";
import { dashboardStats } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="page">
      <PageHeader
        title="דשבורד"
        description="תמונת מצב ראשונית להזמנות, התקנות ומלאי."
      />

      <div className="page-actions dashboard-actions">
        <RefreshDataButton />
      </div>

      <section className="grid stats-grid" aria-label="סיכום תפעולי">
        {dashboardStats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </section>
    </div>
  );
}
