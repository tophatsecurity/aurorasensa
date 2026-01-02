import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SensorCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  children?: React.ReactNode;
  className?: string;
}

const SensorCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconBgColor = "bg-aurora-purple/20",
  children,
  className
}: SensorCardProps) => {
  return (
    <div className={cn(
      "glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all duration-300",
      className
    )}>
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBgColor)}>
          <Icon className="w-6 h-6 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {title}
          </h4>
          {value !== undefined && (
            <p className="text-2xl font-bold text-foreground">
              {value === null || value === undefined ? "—" : value}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default SensorCard;
