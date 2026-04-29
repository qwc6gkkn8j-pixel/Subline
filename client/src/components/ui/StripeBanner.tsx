import { useEffect, useState } from 'react';
import { Banner } from '@/components/ui/Banner';
import { api } from '@/lib/api';
import type { StripeStatus } from '@/lib/types';

interface Props {
  /**
   * "platform" → checks /public/stripe/status (admin / generic)
   * "barber"   → checks /barber/stripe/status (barber connect status)
   */
  variant?: 'platform' | 'barber';
  className?: string;
}

export function StripeBanner({ variant = 'platform', className }: Props) {
  const [status, setStatus] = useState<StripeStatus | null>(null);

  useEffect(() => {
    const url = variant === 'barber' ? '/barber/stripe/status' : '/public/stripe/status';
    api
      .get<StripeStatus>(url)
      .then((r) => setStatus(r.data))
      .catch(() => setStatus(null));
  }, [variant]);

  if (!status) return null;

  if (variant === 'platform') {
    if (status.configured) return null;
    return (
      <Banner tone="warning" title="Stripe ainda não está configurado" className={className}>
        Os fluxos de pagamento estão em modo de pré-visualização. Defina <code>STRIPE_SECRET_KEY</code> e{' '}
        <code>STRIPE_CLIENT_ID</code> no servidor para ativar pagamentos reais.
      </Banner>
    );
  }

  // barber view
  if (!status.configured) {
    return (
      <Banner tone="warning" title="Stripe ainda não está configurado pela plataforma" className={className}>
        O administrador ainda não ativou Stripe Connect. Os links de pagamento ficam disponíveis assim que
        a plataforma estiver pronta.
      </Banner>
    );
  }
  if (!status.barberConnected) {
    return (
      <Banner tone="info" title="Liga a tua conta Stripe" className={className}>
        Para receberes pagamentos diretamente, liga a tua conta Stripe na página de Perfil.
      </Banner>
    );
  }
  return (
    <Banner tone="success" title="Stripe ligado" className={className}>
      Conta Stripe Connect ativa — recebes pagamentos automaticamente.
    </Banner>
  );
}
