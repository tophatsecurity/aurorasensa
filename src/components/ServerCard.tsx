import { Server, Cpu, HardDrive, Wifi } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ServerCardProps {
  name: string;
  location: string;
  status: 'online' | 'warning' | 'offline';
  cpu: number;
  memory: number;
  disk: number;
  ip: string;
}

const statusConfig = {
  online: {
    label: 'Online',
    class: 'status-online',
    textClass: 'text-success',
  },
  warning: {
    label: 'Warning',
    class: 'status-warning',
    textClass: 'text-warning',
  },
  offline: {
    label: 'Offline',
    class: 'status-offline',
    textClass: 'text-destructive',
  },
};

const ServerCard = ({ name, location, status, cpu, memory, disk, ip }: ServerCardProps) => {
  const statusInfo = statusConfig[status];

  return (
    <div className="aurora-border rounded-xl p-5 hover:scale-[1.01] transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
            <Server className="w-5 h-5 text-aurora-cyan" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">{location}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusInfo.class}`} />
          <span className={`text-xs font-medium ${statusInfo.textClass}`}>{statusInfo.label}</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cpu className="w-4 h-4" />
            <span>CPU</span>
          </div>
          <span className="font-medium text-foreground">{cpu}%</span>
        </div>
        <Progress value={cpu} className="h-1.5 bg-secondary" />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="w-4 h-4" />
            <span>Memory</span>
          </div>
          <span className="font-medium text-foreground">{memory}%</span>
        </div>
        <Progress value={memory} className="h-1.5 bg-secondary" />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="w-4 h-4" />
            <span>Disk</span>
          </div>
          <span className="font-medium text-foreground">{disk}%</span>
        </div>
        <Progress value={disk} className="h-1.5 bg-secondary" />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border/50">
        <Wifi className="w-3 h-3" />
        <span className="font-mono">{ip}</span>
      </div>
    </div>
  );
};

export default ServerCard;
