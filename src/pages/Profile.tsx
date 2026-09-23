import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { AlertCircle, CheckCircle, ArrowLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isGuestSession } from '../guest/guestSession';

const decodeVapidKey = (key: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(key.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(key.length / 4) * 4, '='));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [learnerReplyEmailNotifications, setLearnerReplyEmailNotifications] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [pushPublicKey, setPushPublicKey] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState('');
  const pushSupported = !isGuestSession() && window.isSecureContext && 'serviceWorker' in navigator &&
    'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!user || !pushSupported) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await apiFetch('/api/user/push-config');
        if (!response.ok) return;
        const config = await response.json();
        if (cancelled) return;
        setPushPublicKey(config.available ? config.publicKey : null);
        if (config.available && Notification.permission === 'granted') {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (!cancelled) setPushEnabled(Boolean(subscription));
        }
      } catch { if (!cancelled) setPushStatus('Unable to check device notifications right now.'); }
    })();
    return () => { cancelled = true; };
  }, [user?.id, pushSupported]);

  const togglePushNotifications = async () => {
    if (!pushPublicKey || pushBusy) return;
    setPushBusy(true);
    setPushStatus('');
    try {
      if (!pushEnabled && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Allow notifications in your device settings to enable this feature.');
      }
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      if (pushEnabled) {
        if (current) {
          const response = await apiFetch('/api/user/push-subscriptions', {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: current.endpoint }),
          });
          if (!response.ok) throw new Error('Could not disable notifications on this device.');
          await current.unsubscribe();
        }
        setPushEnabled(false);
        setPushStatus('Device notifications turned off.');
      } else {
        const subscription = current || await registration.pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: decodeVapidKey(pushPublicKey),
        });
        const response = await apiFetch('/api/user/push-subscriptions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
        if (!response.ok) {
          if (!current) await subscription.unsubscribe();
          throw new Error('Could not save notifications for this device.');
        }
        setPushEnabled(true);
        setPushStatus('Device notifications turned on.');
      }
    } catch (error) {
      setPushStatus(error instanceof Error ? error.message : 'Could not change device notifications.');
    } finally { setPushBusy(false); }
  };

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setLearnerReplyEmailNotifications(user.learner_reply_email_notifications === true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, newPassword, learnerReplyEmailNotifications }),
      });

      const data = await res.json();
      if (!res.ok) {
        const detailSuffix = data?.details ? `: ${data.details}` : '';
        throw new Error((data?.error || 'Update failed') + detailSuffix);
      }

      if (data?.profile) {
        setName(data.profile.name || '');
        setEmail(data.profile.email || '');
        setLearnerReplyEmailNotifications(data.profile.learner_reply_email_notifications === true);
      }

      await refreshProfile();

      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setNewPassword(''); // Clear password field
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await apiFetch('/api/auth/resend-welcome-email', {
        method: 'POST',
      }, 0);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend email');

      setMessage({ type: 'success', text: 'Welcome email sent! Please check your inbox (and spam folder).' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckEmailDelivery = async () => {
    setIsCheckingEmail(true);
    setMessage({ type: '', text: '' });

    try {
      // SMTP failures are diagnostic results, not transient API failures. Do
      // Do not retry this diagnostic request; it should report its result promptly.
      const res = await apiFetch('/api/email-health', undefined, 0);
      const data = await res.json();

      if (!res.ok) {
        if (Array.isArray(data?.missingVariables) && data.missingVariables.length > 0) {
          throw new Error('Email delivery is not configured yet. Please contact Visual Steps support.');
        }

        const errorCode = data?.smtpError?.code || 'SMTP_CONNECTION_FAILED';
        const responseCode = data?.smtpError?.responseCode ? ` (${data.smtpError.responseCode})` : '';
        throw new Error(`Email connection failed: ${errorCode}${responseCode}`);
      }

      setMessage({ type: 'success', text: 'Email delivery is configured and Gmail accepted the connection.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Unable to check email delivery' });
    } finally {
      setIsCheckingEmail(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">Account Settings</h1>
            <p className="text-lg font-normal text-slate-500 mt-3">Manage your account details and preferences.</p>
          </div>
        </div>
      </div>
      
      <Card className="shadow-sm border-none ring-1 ring-slate-200">
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-base">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            {message.text && (
              <div className={`flex items-center gap-2 rounded p-1.5 text-[12px] ${
                message.type === 'success' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
              }`}>
                {message.type === 'success' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {message.text}
              </div>
            )}

            <div className="grid gap-2.5 md:grid-cols-2">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 text-sm"
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-7 text-sm"
              />
            </div>

            <div className="pt-1.5 border-t border-slate-100">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Change Password</h3>
              <Input
                label="New Password"
                type="password"
                placeholder="Keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-7 text-sm"
              />
            </div>

            <div className="pt-1.5 border-t border-slate-100">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Parent Messaging</h3>
              <p className="text-sm text-slate-600">Messages stay available until you delete them.</p>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={learnerReplyEmailNotifications} onChange={event => setLearnerReplyEmailNotifications(event.target.checked)} />
                Email me when the learner sends a reply
              </label>
              <p className="mt-1 text-[11px] text-slate-500">The email includes the learner's message. Turn this off if you prefer messages to stay inside Visual Steps.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="xs" onClick={() => void togglePushNotifications()}
                  disabled={!pushSupported || !pushPublicKey || pushBusy} className="h-8 gap-1.5 text-sm">
                  <Bell className="h-4 w-4" /> {pushEnabled ? 'Turn off device notifications' : 'Enable device notifications'}
                </Button>
                <span className="text-sm text-slate-600">{pushEnabled ? 'On for this device' : 'Off for this device'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {!pushSupported ? 'Use a supported browser, or add Visual Steps to your iPhone or iPad Home Screen.' :
                  !pushPublicKey ? 'Device notifications are not configured yet.' :
                    'Get a brief alert on this device when your learner replies. Email alerts and the dashboard new count still work separately.'}
              </p>
              {pushStatus && <p role="status" className="mt-1 text-sm text-slate-700">{pushStatus}</p>}
            </div>

            <div className="flex flex-wrap justify-between gap-2 pt-1.5">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="h-7 text-[11px] border-slate-200 text-slate-500 hover:text-slate-700"
                  onClick={handleCheckEmailDelivery}
                  isLoading={isCheckingEmail}
                >
                  Check Email Delivery
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="h-7 text-[11px] border-slate-200 text-slate-500 hover:text-slate-700"
                  onClick={handleResendEmail}
                  isLoading={isResending}
                >
                  Resend Welcome Email
                </Button>
              </div>
              <Button type="submit" size="xs" className="h-7 text-sm" isLoading={isLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
