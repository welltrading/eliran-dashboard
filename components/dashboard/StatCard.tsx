import { Archive, CalendarCheck, ClipboardList, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { DashboardStat } from "@/lib/types";

const icons = [ClipboardList, CalendarCheck, PackageSearch, Archive];

type StatCardProps = {
  stat: DashboardStat;
  index: number;
};

export function StatCard({ stat, index }: StatCardProps) {
  const Icon = icons[index % icons.length];

  return (
    <Card className="stat-card">
      <div className="card__body">
        <div className="stat-card__top">
          <p className="stat-card__label">{stat.label}</p>
          <span className="stat-card__icon" aria-hidden="true">
            <Icon size={20} />
          </span>
        </div>
        <div className="stat-card__value">{stat.value}</div>
        <Badge tone={stat.tone}>{stat.note}</Badge>
      </div>
    </Card>
  );
}
