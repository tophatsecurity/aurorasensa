import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  color: 'cyan' | 'purple' | 'green' | 'blue';
}

const colorStyles = {
  cyan: {
    gradient: 'from-aurora-cyan/20 to-transparent',
    text: 'text-aurora-cyan',
    glow: 'shadow-[0_0_30px_hsl(187_100%_55%/0.2)]',
  },
  purple: {
    gradient: 'from-aurora-purple/20 to-transparent',
    text: 'text-aurora-purple',
    glow: 'shadow-[0_0_30px_hsl(280_100%_70%/0.2)]',
  },
  green: {
    gradient: 'from-aurora-green/20 to-transparent',
    text: 'text-aurora-green',
    glow: 'shadow-[0_0_30px_hsl(160_84%_50%/0.2)]',
  },
  blue: {
    gradient: 'from-aurora-blue/20 to-transparent',
    text: 'text-aurora-blue',
    glow: 'shadow-[0_0_30px_hsl(217_91%_60%/0.2)]',
  },
};

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color }: StatCardProps) => {
  const styles = colorStyles[color];

  return (
    <div className={`glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300 ${styles.glow}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${styles.gradient} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${styles.text}`} />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.positive 
              ? 'bg-success/20 text-success' 
              : 'bg-destructive/20 text-destructive'
          }`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <p className={`text-3xl font-bold ${styles.text} mb-1`}>{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
};

export default StatCard;
