import { useEffect, useState } from 'react';
import {
  Home,
  CreditCard,
  Receipt,
  User as UserIcon,
  Phone,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Barber, Client, Payment, PaymentStatus, Subscription } from '@/lib/types';
import { PLAN_LABEL, PLAN_PRICE } from '@/lib/types';

const PAGE_SIZE = 5;

export default function ClientDashboard() {
  const toast = useToast();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);
  const [barber, setBarber] = useState<(Barber & { user?: { email: string } }) | null>(null);
  const [client, setClient] = useState<(Client & { user?: { email: string; createdAt?: string } }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sub, pay, brb, prof] = await Promise.all([
        api.get<{ subscription: Subscription | null }>('/client/subscription'),
        api.get<{ payments: Payment[]; totalPages: number }>('/client/payments', {
          params: { page: paymentPage, limit: PAGE_SIZE },
        }),
        api.get<{ barber: Barber | null }>('/client/barber'),
        api.get<{ client: Client & { user: { email: string; createdAt: string } } }>('/client/profile'),
      ]);
      setSubscription(sub.data.subscription);
      setPayments(pay.data.payments);
      setPaymentTotalPages(pay.data.totalPages);
      setBarber(brb.data.barber as never);
      setClient(prof.data.client as never);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentPage]);

  return (
    <AppShell
      title="My Subscription"
      bottomNav={
        <BottomNav
          items={[
            { to: '/client', icon: Home, label: 'Home' },
            { to: '/client/subscription', icon: CreditCard, label: 'Plan' },
            { to: '/client/payments', icon: Receipt, label: 'Payments' },
            { to: '/client/profile', icon: UserIcon, label: 'Profile' },
          ]}
        />
      }
    >
      {loading && !subscription ? (
        <div className="py-20 text-center">
          <Spinner size={32} />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Subscription Card */}
          <section className="card relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
            <p className="text-xs uppercase tracking-wide text-muted">Your Subscription</p>
            {subscription ? (
              <>
                <div className="flex items-baseline gap-3 mt-2">
                  <h2 className="text-3xl font-bold text-ink">{PLAN_LABEL[subscription.planType]}</h2>
                  <span className="text-muted">{formatCurrency(PLAN_PRICE[subscription.planType])}/mo</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {subscription.status === 'active' ? (
                    <>
                      <CheckCircle2 size={16} className="text-success" />
                      <span className="text-success font-medium">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} className="text-muted" />
                      <span className="text-muted font-medium">{subscription.status}</span>
                    </>
                  )}
                  <span className="text-muted text-sm">
                    · Valid until {formatDate(subscription.renewalDate)}
                  </span>
                </div>
                {barber && (
                  <p className="text-sm text-muted mt-2">
                    With <span className="text-brand font-medium">{barber.name}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-5">
                  <button
                    onClick={() => setShowCancel(true)}
                    className="btn-outline btn-sm"
                    disabled={subscription.status !== 'active'}
                  >
                    Cancel subscription
                  </button>
                  <button
                    onClick={() => toast.show('Contact form coming soon', 'info')}
                    className="btn-primary btn-sm"
                  >
                    Contact Barber
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-muted">
                You don&apos;t have an active subscription yet. Ask your barber to set one up.
              </p>
            )}
          </section>

          {/* Payment History */}
          <section className="card !p-0 overflow-hidden">
            <div className="p-5 border-b border-line">
              <p className="text-xs uppercase tracking-wide text-muted">Payment History</p>
            </div>
            {payments.length === 0 ? (
              <p className="p-5 text-sm text-muted">No payments yet.</p>
            ) : (
              <div className="divide-y divide-line">
                <div className="hidden sm:grid grid-cols-4 gap-4 px-5 py-2 text-xs uppercase text-muted bg-surface">
                  <span>Date</span>
                  <span>Plan</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>
                {payments.map((p) => (
                  <div key={p.id} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 px-5 py-3 text-sm">
                    <span className="text-ink">{formatDate(p.paymentDate)}</span>
                    <span className="text-muted">
                      {p.subscription?.planType ? PLAN_LABEL[p.subscription.planType] : '—'}
                    </span>
                    <span className="font-medium text-ink">{formatCurrency(Number(p.amount))}</span>
                    <PaymentBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
            {paymentTotalPages > 1 && (
              <div className="px-5 py-3 border-t border-line flex items-center justify-between text-sm">
                <p className="text-muted">
                  Page {paymentPage} of {paymentTotalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                    disabled={paymentPage <= 1}
                    className="btn-outline btn-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPaymentPage((p) => Math.min(paymentTotalPages, p + 1))}
                    disabled={paymentPage >= paymentTotalPages}
                    className="btn-outline btn-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Barber Card */}
          {barber && (
            <section className="card">
              <p className="text-xs uppercase tracking-wide text-muted mb-3">Your Barber</p>
              <div className="flex items-start gap-4">
                <Avatar name={barber.name} size={60} />
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-ink">{barber.name}</p>
                  <div className="flex items-center gap-1 text-sm text-muted">
                    <Star size={14} className="text-warning fill-warning" />
                    <span>{Number(barber.rating ?? 0).toFixed(1)}/5</span>
                  </div>
                  {barber.address && (
                    <p className="flex items-center gap-1.5 text-sm text-muted mt-1">
                      <MapPin size={14} /> {barber.address}
                    </p>
                  )}
                  {barber.phone && (
                    <p className="flex items-center gap-1.5 text-sm text-muted">
                      <Phone size={14} /> {barber.phone}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Profile */}
          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wide text-muted">Personal Information</p>
              <button onClick={() => setShowProfile(true)} className="btn-outline btn-sm">
                Edit Profile
              </button>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div>
                <dt className="text-muted text-xs">Name</dt>
                <dd className="text-ink font-medium">{client?.name ?? user?.fullName}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Email</dt>
                <dd className="text-ink font-medium break-all">{client?.email ?? user?.email}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Phone</dt>
                <dd className="text-ink font-medium">{client?.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Joined</dt>
                <dd className="text-ink font-medium">
                  {client?.createdAt ? formatDate(client.createdAt) : '—'}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      <CancelSubscriptionModal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onCancelled={() => void loadAll()}
      />
      <EditProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        initial={{
          name: client?.name ?? user?.fullName ?? '',
          email: client?.email ?? user?.email ?? '',
          phone: client?.phone ?? '',
        }}
        onSaved={() => void loadAll()}
      />
    </AppShell>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  if (status === 'paid')
    return (
      <span className="badge-success inline-flex items-center gap-1">
        <CheckCircle2 size={12} /> Paid
      </span>
    );
  if (status === 'pending')
    return (
      <span className="badge-warning inline-flex items-center gap-1">
        <Clock size={12} /> Pending
      </span>
    );
  return (
    <span className="badge-danger inline-flex items-center gap-1">
      <XCircle size={12} /> Failed
    </span>
  );
}

function CancelSubscriptionModal({
  open,
  onClose,
  onCancelled,
}: {
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    try {
      await api.post('/client/subscription/cancel', { reason });
      toast.success('Cancellation requested');
      setReason('');
      onCancelled();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel subscription?"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Keep my plan
          </button>
          <button className="btn-danger" onClick={onSubmit} disabled={busy}>
            {busy ? <Spinner /> : 'Cancel subscription'}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink mb-3">
        Your subscription will remain active until the end of the current billing period.
      </p>
      <label className="label">Reason (optional)</label>
      <textarea
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Help us improve…"
      />
    </Modal>
  );
}

function EditProfileModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial: { name: string; email: string; phone: string };
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial.name);
      setEmail(initial.email);
      setPhone(initial.phone);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setError(null);
    }
  }, [open, initial]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.put('/client/profile', { name, email, phone: phone || null });
      if (newPassword) {
        if (newPassword !== confirm) throw new Error('New passwords do not match');
        if (!currentPassword) throw new Error('Current password is required to change it');
        await api.put('/client/password', {
          currentPassword,
          newPassword,
          confirmPassword: confirm,
        });
      }
      toast.success('Profile updated');
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profile"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button form="profile-form" type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : 'Save Changes'}
          </button>
        </>
      }
    >
      <form id="profile-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="border-t border-line pt-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">
            Change password (optional)
          </p>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        {error && (
          <div className={cn('bg-danger/10 text-danger text-sm rounded-button px-3 py-2')}>
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
