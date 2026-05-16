type BadgeProps = {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger";
};

export function Badge({ children, tone = "success" }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
