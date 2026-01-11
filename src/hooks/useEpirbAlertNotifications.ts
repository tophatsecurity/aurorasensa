import { useEffect, useRef } from "react";
import { useEpirbActiveAlerts, EpirbBeacon } from "@/hooks/aurora/maritime";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

// EPIRB alerts are disabled until the maritime API endpoints are available
const EPIRB_ALERTS_ENABLED = false;

export function useEpirbAlertNotifications() {
  // Return empty data when EPIRB alerts are disabled
  if (!EPIRB_ALERTS_ENABLED) {
    return { activeAlerts: [] as EpirbBeacon[] };
  }

  const { data: activeAlerts } = useEpirbActiveAlerts();
  const previousAlertsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!activeAlerts) return;

    const currentAlertIds = new Set(activeAlerts.map(a => a.beacon_id));
    
    // Skip notification on initial load
    if (initialLoadRef.current) {
      previousAlertsRef.current = currentAlertIds;
      initialLoadRef.current = false;
      return;
    }

    // Find new alerts (not in previous set)
    const newAlerts = activeAlerts.filter(
      alert => !previousAlertsRef.current.has(alert.beacon_id)
    );

    // Show toast for each new alert
    newAlerts.forEach((alert) => {
      const vesselName = alert.owner_info?.vessel_name || "Unknown Vessel";
      const beaconType = alert.beacon_type || "EPIRB";
      const status = alert.status === "active" ? "DISTRESS" : alert.status.toUpperCase();
      const position = `${alert.lat?.toFixed(4)}°, ${alert.lon?.toFixed(4)}°`;
      const activatedTime = alert.activation_time 
        ? formatDistanceToNow(new Date(alert.activation_time), { addSuffix: true })
        : null;
      
      const descriptionParts = [
        `Vessel: ${vesselName}`,
        `Beacon: ${alert.beacon_id}`,
        `Position: ${position}`,
      ];
      
      if (activatedTime) {
        descriptionParts.push(`Activated: ${activatedTime}`);
      }
      
      if (alert.signal_strength) {
        descriptionParts.push(`Signal: ${alert.signal_strength} dBm`);
      }
      
      toast({
        variant: "destructive",
        title: `🚨 ${beaconType} ${status} SIGNAL`,
        description: descriptionParts.join(" • "),
      });
    });

    // Update previous alerts reference
    previousAlertsRef.current = currentAlertIds;
  }, [activeAlerts]);

  return { activeAlerts };
}
