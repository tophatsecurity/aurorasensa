// Default Alert Rules - 94 predefined rules covering all sensor types
// These can be bulk-imported to the Aurora API

export interface DefaultAlertRule {
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  sensor_type_filter: string;
  conditions: {
    field: string;
    operator: string;
    value: number | string;
  }[];
  notification_channels: string[];
  cooldown_minutes: number;
  enabled: boolean;
  category: string;
}

export const DEFAULT_ALERT_RULES: DefaultAlertRule[] = [
  // ==========================================
  // ARDUINO SENSOR KIT RULES (15 rules)
  // ==========================================
  {
    name: "High Temperature Alert",
    description: "Triggers when temperature exceeds safe operating range",
    severity: "warning",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "temperature", operator: ">", value: 35 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Critical High Temperature",
    description: "Temperature exceeds critical threshold - immediate action required",
    severity: "critical",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "temperature", operator: ">", value: 45 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Low Temperature Warning",
    description: "Temperature below minimum threshold",
    severity: "warning",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "temperature", operator: "<", value: 5 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Freezing Temperature Alert",
    description: "Temperature approaching freezing point",
    severity: "critical",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "temperature", operator: "<", value: 0 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Environment"
  },
  {
    name: "High Humidity Alert",
    description: "Humidity exceeds comfortable levels",
    severity: "warning",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "humidity", operator: ">", value: 80 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Critical Humidity",
    description: "Humidity at dangerous levels - risk of condensation",
    severity: "critical",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "humidity", operator: ">", value: 95 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 10,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Low Humidity Warning",
    description: "Humidity below comfortable levels",
    severity: "info",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "humidity", operator: "<", value: 30 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: true,
    category: "Environment"
  },
  {
    name: "High Pressure Alert",
    description: "Atmospheric pressure above normal",
    severity: "info",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "pressure", operator: ">", value: 1030 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: false,
    category: "Environment"
  },
  {
    name: "Low Pressure Warning",
    description: "Atmospheric pressure dropping - possible storm",
    severity: "warning",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "pressure", operator: "<", value: 990 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Light Level Low",
    description: "Light levels below threshold",
    severity: "info",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "light", operator: "<", value: 100 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: false,
    category: "Environment"
  },
  {
    name: "Light Level High",
    description: "Light levels above threshold",
    severity: "info",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "light", operator: ">", value: 900 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: false,
    category: "Environment"
  },
  {
    name: "Motion Detected",
    description: "Motion sensor triggered",
    severity: "info",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "motion", operator: "==", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Security"
  },
  {
    name: "Prolonged Motion",
    description: "Continuous motion detected for extended period",
    severity: "warning",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "motion", operator: ">", value: 10 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Security"
  },
  {
    name: "Temperature Rapid Rise",
    description: "Temperature increasing rapidly",
    severity: "warning",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "temperature_delta", operator: ">", value: 5 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 10,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Humidity Rapid Change",
    description: "Humidity changing rapidly",
    severity: "info",
    sensor_type_filter: "arduino_sensor_kit",
    conditions: [{ field: "humidity_delta", operator: ">", value: 20 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: false,
    category: "Environment"
  },

  // ==========================================
  // SYSTEM MONITOR RULES (12 rules)
  // ==========================================
  {
    name: "High CPU Usage",
    description: "CPU utilization above normal operating threshold",
    severity: "warning",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "cpu_usage", operator: ">", value: 80 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 10,
    enabled: true,
    category: "System"
  },
  {
    name: "Critical CPU Usage",
    description: "CPU utilization at critical levels",
    severity: "critical",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "cpu_usage", operator: ">", value: 95 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "System"
  },
  {
    name: "High Memory Usage",
    description: "Memory utilization above threshold",
    severity: "warning",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "memory_usage", operator: ">", value: 85 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "System"
  },
  {
    name: "Critical Memory Usage",
    description: "Memory nearly exhausted",
    severity: "critical",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "memory_usage", operator: ">", value: 95 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "System"
  },
  {
    name: "High Disk Usage",
    description: "Disk space running low",
    severity: "warning",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "disk_usage", operator: ">", value: 80 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: true,
    category: "System"
  },
  {
    name: "Critical Disk Usage",
    description: "Disk space critically low",
    severity: "critical",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "disk_usage", operator: ">", value: 95 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 30,
    enabled: true,
    category: "System"
  },
  {
    name: "High CPU Temperature",
    description: "CPU temperature above safe threshold",
    severity: "warning",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "temperature", operator: ">", value: 70 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 10,
    enabled: true,
    category: "System"
  },
  {
    name: "Critical CPU Temperature",
    description: "CPU temperature at dangerous levels",
    severity: "critical",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "temperature", operator: ">", value: 85 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "System"
  },
  {
    name: "Low Available Memory",
    description: "Available memory below minimum threshold",
    severity: "warning",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "available_memory_mb", operator: "<", value: 500 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "System"
  },
  {
    name: "High Load Average",
    description: "System load average exceeds normal",
    severity: "warning",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "load_average", operator: ">", value: 4 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "System"
  },
  {
    name: "Critical Load Average",
    description: "System severely overloaded",
    severity: "critical",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "load_average", operator: ">", value: 8 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "System"
  },
  {
    name: "Swap Usage High",
    description: "System using swap space excessively",
    severity: "warning",
    sensor_type_filter: "system_monitor",
    conditions: [{ field: "swap_usage", operator: ">", value: 50 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "System"
  },

  // ==========================================
  // STARLINK RULES (12 rules)
  // ==========================================
  {
    name: "Low Download Speed",
    description: "Download speed below expected threshold",
    severity: "warning",
    sensor_type_filter: "starlink",
    conditions: [{ field: "download_speed", operator: "<", value: 50 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "Critical Download Speed",
    description: "Download speed severely degraded",
    severity: "critical",
    sensor_type_filter: "starlink",
    conditions: [{ field: "download_speed", operator: "<", value: 10 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Network"
  },
  {
    name: "Low Upload Speed",
    description: "Upload speed below threshold",
    severity: "warning",
    sensor_type_filter: "starlink",
    conditions: [{ field: "upload_speed", operator: "<", value: 10 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "High Latency",
    description: "Network latency above acceptable threshold",
    severity: "warning",
    sensor_type_filter: "starlink",
    conditions: [{ field: "latency", operator: ">", value: 100 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Network"
  },
  {
    name: "Critical Latency",
    description: "Network latency severely degraded",
    severity: "critical",
    sensor_type_filter: "starlink",
    conditions: [{ field: "latency", operator: ">", value: 200 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 10,
    enabled: true,
    category: "Network"
  },
  {
    name: "Poor Signal Quality",
    description: "Starlink signal quality degraded",
    severity: "warning",
    sensor_type_filter: "starlink",
    conditions: [{ field: "signal_quality", operator: "<", value: 80 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "Critical Signal Quality",
    description: "Starlink signal quality severely degraded",
    severity: "critical",
    sensor_type_filter: "starlink",
    conditions: [{ field: "signal_quality", operator: "<", value: 50 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Network"
  },
  {
    name: "High Obstruction",
    description: "Dish obstruction affecting performance",
    severity: "warning",
    sensor_type_filter: "starlink_dish_comprehensive",
    conditions: [{ field: "obstruction_percent", operator: ">", value: 5 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: true,
    category: "Network"
  },
  {
    name: "Critical Obstruction",
    description: "Severe dish obstruction",
    severity: "critical",
    sensor_type_filter: "starlink_dish_comprehensive",
    conditions: [{ field: "obstruction_percent", operator: ">", value: 20 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "High Dish Temperature",
    description: "Starlink dish temperature elevated",
    severity: "warning",
    sensor_type_filter: "starlink_dish_comprehensive",
    conditions: [{ field: "dish_temperature", operator: ">", value: 50 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "Critical Dish Temperature",
    description: "Starlink dish temperature at dangerous levels",
    severity: "critical",
    sensor_type_filter: "starlink_dish_comprehensive",
    conditions: [{ field: "dish_temperature", operator: ">", value: 70 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Network"
  },
  {
    name: "Dish Uptime Reset",
    description: "Starlink dish has recently rebooted",
    severity: "info",
    sensor_type_filter: "starlink_dish_comprehensive",
    conditions: [{ field: "uptime", operator: "<", value: 300 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: true,
    category: "Network"
  },

  // ==========================================
  // WIFI SCANNER RULES (10 rules)
  // ==========================================
  {
    name: "Weak WiFi Signal",
    description: "WiFi signal strength below threshold",
    severity: "warning",
    sensor_type_filter: "wifi_scanner",
    conditions: [{ field: "signal_strength", operator: "<", value: -70 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "Very Weak WiFi Signal",
    description: "WiFi signal critically weak",
    severity: "critical",
    sensor_type_filter: "wifi_scanner",
    conditions: [{ field: "signal_strength", operator: "<", value: -85 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Network"
  },
  {
    name: "High Client Count",
    description: "Many clients connected to network",
    severity: "info",
    sensor_type_filter: "wifi_scanner",
    conditions: [{ field: "client_count", operator: ">", value: 50 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: true,
    category: "Network"
  },
  {
    name: "Excessive Client Count",
    description: "Too many clients - network may be congested",
    severity: "warning",
    sensor_type_filter: "wifi_scanner",
    conditions: [{ field: "client_count", operator: ">", value: 100 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "New Network Detected",
    description: "Previously unseen WiFi network detected",
    severity: "info",
    sensor_type_filter: "wifi_scanner",
    conditions: [{ field: "new_network", operator: "==", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Security"
  },
  {
    name: "Rogue AP Detected",
    description: "Potential rogue access point detected",
    severity: "critical",
    sensor_type_filter: "wifi_scanner",
    conditions: [{ field: "rogue_ap", operator: "==", value: 1 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Security"
  },
  {
    name: "Channel Congestion",
    description: "WiFi channel heavily congested",
    severity: "warning",
    sensor_type_filter: "wifi_scanner",
    conditions: [{ field: "channel_utilization", operator: ">", value: 70 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "Deauth Attack Detected",
    description: "Possible deauthentication attack in progress",
    severity: "critical",
    sensor_type_filter: "wifi_scanner",
    conditions: [{ field: "deauth_count", operator: ">", value: 10 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Security"
  },
  {
    name: "Hidden SSID Detected",
    description: "Hidden network detected in range",
    severity: "info",
    sensor_type_filter: "wifi_scanner",
    conditions: [{ field: "hidden_ssid", operator: "==", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: false,
    category: "Security"
  },
  {
    name: "WEP Network Detected",
    description: "Insecure WEP network detected",
    severity: "warning",
    sensor_type_filter: "wifi_scanner",
    conditions: [{ field: "wep_network", operator: "==", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: true,
    category: "Security"
  },

  // ==========================================
  // BLUETOOTH SCANNER RULES (8 rules)
  // ==========================================
  {
    name: "High Device Count",
    description: "Many Bluetooth devices detected",
    severity: "info",
    sensor_type_filter: "bluetooth_scanner",
    conditions: [{ field: "device_count", operator: ">", value: 20 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "Excessive Devices",
    description: "Unusually high number of Bluetooth devices",
    severity: "warning",
    sensor_type_filter: "bluetooth_scanner",
    conditions: [{ field: "device_count", operator: ">", value: 50 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Network"
  },
  {
    name: "Strong BLE Signal",
    description: "Bluetooth device very close",
    severity: "info",
    sensor_type_filter: "bluetooth_scanner",
    conditions: [{ field: "rssi", operator: ">", value: -30 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 10,
    enabled: false,
    category: "Security"
  },
  {
    name: "New Device Detected",
    description: "Previously unseen Bluetooth device",
    severity: "info",
    sensor_type_filter: "bluetooth_scanner",
    conditions: [{ field: "new_device", operator: "==", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Security"
  },
  {
    name: "Low Battery Device",
    description: "Bluetooth device has low battery",
    severity: "warning",
    sensor_type_filter: "bluetooth_scanner",
    conditions: [{ field: "battery_level", operator: "<", value: 20 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 60,
    enabled: true,
    category: "Device"
  },
  {
    name: "Critical Battery Device",
    description: "Bluetooth device battery critically low",
    severity: "critical",
    sensor_type_filter: "bluetooth_scanner",
    conditions: [{ field: "battery_level", operator: "<", value: 5 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Device"
  },
  {
    name: "Suspicious BLE Beacon",
    description: "Potentially malicious BLE beacon detected",
    severity: "warning",
    sensor_type_filter: "bluetooth_scanner",
    conditions: [{ field: "suspicious_beacon", operator: "==", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Security"
  },
  {
    name: "BLE Tracking Device",
    description: "Possible tracking device (AirTag, Tile, etc.) detected",
    severity: "info",
    sensor_type_filter: "bluetooth_scanner",
    conditions: [{ field: "tracking_device", operator: "==", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Security"
  },

  // ==========================================
  // THERMAL PROBE RULES (6 rules)
  // ==========================================
  {
    name: "Thermal Probe High Temp",
    description: "Thermal probe reading high temperature",
    severity: "warning",
    sensor_type_filter: "thermal_probe",
    conditions: [{ field: "temperature", operator: ">", value: 50 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Thermal Probe Critical Temp",
    description: "Thermal probe reading critical temperature",
    severity: "critical",
    sensor_type_filter: "thermal_probe",
    conditions: [{ field: "temperature", operator: ">", value: 80 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Thermal Probe Low Temp",
    description: "Thermal probe reading low temperature",
    severity: "warning",
    sensor_type_filter: "thermal_probe",
    conditions: [{ field: "temperature", operator: "<", value: 0 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Environment"
  },
  {
    name: "High Temperature Delta",
    description: "Large difference between probe and ambient temperature",
    severity: "warning",
    sensor_type_filter: "thermal_probe",
    conditions: [{ field: "delta", operator: ">", value: 20 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Ambient Temperature High",
    description: "Ambient temperature elevated",
    severity: "warning",
    sensor_type_filter: "thermal_probe",
    conditions: [{ field: "ambient_temp", operator: ">", value: 40 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Environment"
  },
  {
    name: "Rapid Temperature Change",
    description: "Temperature changing rapidly",
    severity: "warning",
    sensor_type_filter: "thermal_probe",
    conditions: [{ field: "rate_of_change", operator: ">", value: 5 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 10,
    enabled: true,
    category: "Environment"
  },

  // ==========================================
  // ADS-B DETECTOR RULES (10 rules)
  // ==========================================
  {
    name: "Aircraft Count High",
    description: "Unusually high number of aircraft detected",
    severity: "info",
    sensor_type_filter: "adsb_detector",
    conditions: [{ field: "aircraft_count", operator: ">", value: 50 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Aviation"
  },
  {
    name: "Low Altitude Aircraft",
    description: "Aircraft flying at low altitude",
    severity: "warning",
    sensor_type_filter: "adsb_detector",
    conditions: [{ field: "altitude", operator: "<", value: 1000 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 10,
    enabled: true,
    category: "Aviation"
  },
  {
    name: "Very Low Altitude Aircraft",
    description: "Aircraft at very low altitude - possible landing/takeoff",
    severity: "info",
    sensor_type_filter: "adsb_detector",
    conditions: [{ field: "altitude", operator: "<", value: 500 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Aviation"
  },
  {
    name: "High Speed Aircraft",
    description: "Fast-moving aircraft detected",
    severity: "info",
    sensor_type_filter: "adsb_detector",
    conditions: [{ field: "speed", operator: ">", value: 500 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Aviation"
  },
  {
    name: "Aircraft Nearby",
    description: "Aircraft within close proximity",
    severity: "info",
    sensor_type_filter: "adsb_detector",
    conditions: [{ field: "distance", operator: "<", value: 5 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Aviation"
  },
  {
    name: "Aircraft Very Close",
    description: "Aircraft within very close proximity",
    severity: "warning",
    sensor_type_filter: "adsb_detector",
    conditions: [{ field: "distance", operator: "<", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 2,
    enabled: true,
    category: "Aviation"
  },
  {
    name: "Military Aircraft",
    description: "Military aircraft detected",
    severity: "info",
    sensor_type_filter: "adsb_detector",
    conditions: [{ field: "military", operator: "==", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Aviation"
  },
  {
    name: "Emergency Squawk",
    description: "Aircraft squawking emergency code",
    severity: "critical",
    sensor_type_filter: "adsb_detector",
    conditions: [{ field: "squawk", operator: "==", value: 7700 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Aviation"
  },
  {
    name: "Hijack Squawk",
    description: "Aircraft squawking hijack code",
    severity: "critical",
    sensor_type_filter: "adsb_detector",
    conditions: [{ field: "squawk", operator: "==", value: 7500 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Aviation"
  },
  {
    name: "Radio Failure Squawk",
    description: "Aircraft squawking radio failure code",
    severity: "warning",
    sensor_type_filter: "adsb_detector",
    conditions: [{ field: "squawk", operator: "==", value: 7600 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Aviation"
  },

  // ==========================================
  // LORA DETECTOR RULES (8 rules)
  // ==========================================
  {
    name: "Weak LoRa Signal",
    description: "LoRa signal strength below threshold",
    severity: "warning",
    sensor_type_filter: "lora_detector",
    conditions: [{ field: "rssi", operator: "<", value: -110 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "Critical LoRa Signal",
    description: "LoRa signal critically weak",
    severity: "critical",
    sensor_type_filter: "lora_detector",
    conditions: [{ field: "rssi", operator: "<", value: -120 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Network"
  },
  {
    name: "Poor SNR",
    description: "Signal-to-noise ratio below acceptable levels",
    severity: "warning",
    sensor_type_filter: "lora_detector",
    conditions: [{ field: "snr", operator: "<", value: -5 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "High Packet Rate",
    description: "Unusually high LoRa packet rate",
    severity: "info",
    sensor_type_filter: "lora_detector",
    conditions: [{ field: "packet_count", operator: ">", value: 100 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Network"
  },
  {
    name: "Unusual Frequency",
    description: "LoRa transmission on unexpected frequency",
    severity: "warning",
    sensor_type_filter: "lora_detector",
    conditions: [{ field: "frequency_deviation", operator: ">", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Security"
  },
  {
    name: "New LoRa Device",
    description: "Previously unseen LoRa device detected",
    severity: "info",
    sensor_type_filter: "lora_detector",
    conditions: [{ field: "new_device", operator: "==", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Security"
  },
  {
    name: "LoRa Jamming Detected",
    description: "Possible LoRa jamming detected",
    severity: "critical",
    sensor_type_filter: "lora_detector",
    conditions: [{ field: "jamming", operator: "==", value: 1 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Security"
  },
  {
    name: "Packet Loss High",
    description: "High packet loss rate on LoRa network",
    severity: "warning",
    sensor_type_filter: "lora_detector",
    conditions: [{ field: "packet_loss", operator: ">", value: 20 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Network"
  },

  // ==========================================
  // GPS TRACKER RULES (8 rules)
  // ==========================================
  {
    name: "High Speed Alert",
    description: "GPS device moving at high speed",
    severity: "warning",
    sensor_type_filter: "gps_tracker",
    conditions: [{ field: "speed", operator: ">", value: 120 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 10,
    enabled: true,
    category: "Location"
  },
  {
    name: "Excessive Speed",
    description: "GPS device moving at dangerous speed",
    severity: "critical",
    sensor_type_filter: "gps_tracker",
    conditions: [{ field: "speed", operator: ">", value: 180 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Location"
  },
  {
    name: "High Altitude",
    description: "GPS device at high altitude",
    severity: "info",
    sensor_type_filter: "gps_tracker",
    conditions: [{ field: "altitude", operator: ">", value: 3000 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Location"
  },
  {
    name: "Poor GPS Accuracy",
    description: "GPS accuracy degraded",
    severity: "warning",
    sensor_type_filter: "gps_tracker",
    conditions: [{ field: "accuracy", operator: ">", value: 50 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Location"
  },
  {
    name: "GPS Signal Lost",
    description: "GPS signal quality very poor",
    severity: "critical",
    sensor_type_filter: "gps_tracker",
    conditions: [{ field: "satellites", operator: "<", value: 4 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Location"
  },
  {
    name: "Low Satellite Count",
    description: "GPS tracking with minimal satellites",
    severity: "warning",
    sensor_type_filter: "gps_tracker",
    conditions: [{ field: "satellites", operator: "<", value: 6 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Location"
  },
  {
    name: "Geofence Exit",
    description: "Device has left designated area",
    severity: "warning",
    sensor_type_filter: "gps_tracker",
    conditions: [{ field: "geofence_exit", operator: "==", value: 1 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Location"
  },
  {
    name: "Geofence Entry",
    description: "Device has entered designated area",
    severity: "info",
    sensor_type_filter: "gps_tracker",
    conditions: [{ field: "geofence_entry", operator: "==", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Location"
  },

  // ==========================================
  // MARITIME/AIS RULES (5 rules)
  // ==========================================
  {
    name: "Vessel Nearby",
    description: "Vessel detected within close proximity",
    severity: "info",
    sensor_type_filter: "ais_receiver",
    conditions: [{ field: "distance", operator: "<", value: 5 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 15,
    enabled: true,
    category: "Maritime"
  },
  {
    name: "Vessel Very Close",
    description: "Vessel at very close range",
    severity: "warning",
    sensor_type_filter: "ais_receiver",
    conditions: [{ field: "distance", operator: "<", value: 1 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 5,
    enabled: true,
    category: "Maritime"
  },
  {
    name: "High Speed Vessel",
    description: "Fast-moving vessel detected",
    severity: "info",
    sensor_type_filter: "ais_receiver",
    conditions: [{ field: "speed", operator: ">", value: 30 }],
    notification_channels: ["dashboard"],
    cooldown_minutes: 30,
    enabled: true,
    category: "Maritime"
  },
  {
    name: "EPIRB Distress Signal",
    description: "Emergency distress beacon activated",
    severity: "critical",
    sensor_type_filter: "epirb_receiver",
    conditions: [{ field: "distress", operator: "==", value: 1 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 1,
    enabled: true,
    category: "Maritime"
  },
  {
    name: "MOB Alert",
    description: "Man overboard alert received",
    severity: "critical",
    sensor_type_filter: "ais_receiver",
    conditions: [{ field: "mob_alert", operator: "==", value: 1 }],
    notification_channels: ["dashboard", "email"],
    cooldown_minutes: 1,
    enabled: true,
    category: "Maritime"
  },
];

// Get rules grouped by category
export function getRulesByCategory(): Record<string, DefaultAlertRule[]> {
  return DEFAULT_ALERT_RULES.reduce((acc, rule) => {
    if (!acc[rule.category]) {
      acc[rule.category] = [];
    }
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, DefaultAlertRule[]>);
}

// Get rules grouped by sensor type
export function getRulesBySensorType(): Record<string, DefaultAlertRule[]> {
  return DEFAULT_ALERT_RULES.reduce((acc, rule) => {
    if (!acc[rule.sensor_type_filter]) {
      acc[rule.sensor_type_filter] = [];
    }
    acc[rule.sensor_type_filter].push(rule);
    return acc;
  }, {} as Record<string, DefaultAlertRule[]>);
}

// Get count of rules by severity
export function getRuleCountBySeverity(): Record<string, number> {
  return DEFAULT_ALERT_RULES.reduce((acc, rule) => {
    acc[rule.severity] = (acc[rule.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// Get only enabled rules
export function getEnabledDefaultRules(): DefaultAlertRule[] {
  return DEFAULT_ALERT_RULES.filter(rule => rule.enabled);
}
