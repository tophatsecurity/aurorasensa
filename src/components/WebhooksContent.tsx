import { useState, useEffect } from "react";
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  Send,
  Bell,
  Mail,
  Link,
  Clock,
  Shield,
  TestTube,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAlertSettings, useUpdateAlertSettings, useTestAlert } from "@/hooks/aurora";
import { useQueryClient } from "@tanstack/react-query";

const WebhooksContent = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError, refetch } = useAlertSettings();
  const updateSettings = useUpdateAlertSettings();
  const testAlert = useTestAlert();

  // Local state for form
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(300);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with fetched data
  useEffect(() => {
    if (settings) {
      setWebhookEnabled(settings.webhook_enabled || false);
      setWebhookUrl(settings.webhook_url || "");
      setEmailEnabled(settings.email_enabled || false);
      setEmailRecipients(settings.email_recipients || []);
      setCooldownSeconds(settings.cooldown_seconds || 300);
      setHasChanges(false);
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        webhook_enabled: webhookEnabled,
        webhook_url: webhookUrl || undefined,
        email_enabled: emailEnabled,
        email_recipients: emailRecipients.length > 0 ? emailRecipients : undefined,
        cooldown_seconds: cooldownSeconds,
      });
      toast.success("Webhook settings saved successfully");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save webhook settings");
      console.error("Save error:", error);
    }
  };

  const handleTestWebhook = async () => {
    try {
      await testAlert.mutateAsync();
      toast.success("Test alert sent successfully");
    } catch (error) {
      toast.error("Failed to send test alert");
      console.error("Test error:", error);
    }
  };

  const addEmailRecipient = () => {
    if (newEmail && !emailRecipients.includes(newEmail)) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        setEmailRecipients([...emailRecipients, newEmail]);
        setNewEmail("");
        setHasChanges(true);
      } else {
        toast.error("Please enter a valid email address");
      }
    }
  };

  const removeEmailRecipient = (email: string) => {
    setEmailRecipients(emailRecipients.filter(e => e !== email));
    setHasChanges(true);
  };

  const markChanged = () => setHasChanges(true);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">Failed to load webhook settings</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary" />
            Webhooks & Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure webhooks and notification settings for alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={!hasChanges || updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Webhook Configuration */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              Webhook Configuration
            </CardTitle>
            <CardDescription>
              Send alert notifications to external services via HTTP webhooks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="webhook-enabled">Enable Webhook</Label>
                <p className="text-sm text-muted-foreground">
                  Send POST requests to your webhook URL
                </p>
              </div>
              <Switch
                id="webhook-enabled"
                checked={webhookEnabled}
                onCheckedChange={(checked) => {
                  setWebhookEnabled(checked);
                  markChanged();
                }}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-service.com/webhook"
                value={webhookUrl}
                onChange={(e) => {
                  setWebhookUrl(e.target.value);
                  markChanged();
                }}
                disabled={!webhookEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Alerts will be sent as JSON POST requests to this URL
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestWebhook}
                disabled={!webhookEnabled || !webhookUrl || testAlert.isPending}
              >
                {testAlert.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Send Test
              </Button>
            </div>

            {webhookEnabled && webhookUrl && (
              <div className="rounded-lg bg-muted/50 p-3 mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Example Payload:</p>
                <pre className="text-xs text-foreground/80 overflow-x-auto">
{`{
  "id": "alert_123",
  "type": "threshold_exceeded",
  "severity": "warning",
  "message": "Temperature above threshold",
  "device_id": "sensor_01",
  "timestamp": "2025-01-07T12:00:00Z"
}`}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Send alert notifications via email to specified recipients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send emails when alerts are triggered
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={emailEnabled}
                onCheckedChange={(checked) => {
                  setEmailEnabled(checked);
                  markChanged();
                }}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Email Recipients</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addEmailRecipient()}
                  disabled={!emailEnabled}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addEmailRecipient}
                  disabled={!emailEnabled || !newEmail}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {emailRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {emailRecipients.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        onClick={() => removeEmailRecipient(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cooldown Settings */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Notification Cooldown
            </CardTitle>
            <CardDescription>
              Prevent notification spam by setting a cooldown period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cooldown">Cooldown Period (seconds)</Label>
              <Input
                id="cooldown"
                type="number"
                min={0}
                max={86400}
                value={cooldownSeconds}
                onChange={(e) => {
                  setCooldownSeconds(parseInt(e.target.value) || 0);
                  markChanged();
                }}
              />
              <p className="text-xs text-muted-foreground">
                Minimum time between notifications for the same alert rule.
                Set to 0 to disable cooldown.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {[60, 300, 900, 1800, 3600, 86400].map((seconds) => (
                <Button
                  key={seconds}
                  variant={cooldownSeconds === seconds ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCooldownSeconds(seconds);
                    markChanged();
                  }}
                >
                  {seconds < 60 ? `${seconds}s` : 
                   seconds < 3600 ? `${seconds / 60}m` : 
                   seconds < 86400 ? `${seconds / 3600}h` : '1d'}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Overview */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Status Overview
            </CardTitle>
            <CardDescription>
              Current notification configuration status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Webhook</span>
                </div>
                <Badge variant={webhookEnabled && webhookUrl ? "default" : "secondary"}>
                  {webhookEnabled && webhookUrl ? "Active" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Email</span>
                </div>
                <Badge variant={emailEnabled && emailRecipients.length > 0 ? "default" : "secondary"}>
                  {emailEnabled && emailRecipients.length > 0 
                    ? `${emailRecipients.length} recipient${emailRecipients.length > 1 ? 's' : ''}`
                    : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Cooldown</span>
                </div>
                <Badge variant="outline">
                  {cooldownSeconds === 0 ? "None" : 
                   cooldownSeconds < 60 ? `${cooldownSeconds}s` :
                   cooldownSeconds < 3600 ? `${Math.floor(cooldownSeconds / 60)}m` :
                   `${Math.floor(cooldownSeconds / 3600)}h`}
                </Badge>
              </div>

              {hasChanges && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Bell className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    You have unsaved changes
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WebhooksContent;
