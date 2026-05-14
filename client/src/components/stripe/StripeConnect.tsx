import { useEffect, useRef, useState } from 'react';
import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js';
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectPayouts,
} from '@stripe/react-connect-js';
import { api, apiErrorMessage } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

interface Props {
  publishableKey: string;
  accountId: string | null;
  connected: boolean;
  onConnected: () => void;
}

type Mode = 'idle' | 'loading' | 'onboarding' | 'payouts';

export function StripeConnect({ publishableKey, accountId, connected, onConnected }: Props) {
  const toast = useToast();
  const instanceRef = useRef<StripeConnectInstance | null>(null);
  const [instance, setInstance] = useState<StripeConnectInstance | null>(null);
  const [mode, setMode] = useState<Mode>(() => {
    if (connected) return 'idle';
    if (accountId) return 'loading'; // has account → auto-start onboarding
    return 'idle';
  });

  const fetchClientSecret = async () => {
    const { data } = await api.post<{ clientSecret: string }>('/pro/stripe/account-session');
    return data.clientSecret;
  };

  const initInstance = async (): Promise<StripeConnectInstance> => {
    if (instanceRef.current) return instanceRef.current;
    const inst = await loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret,
      appearance: {
        overlays: 'dialog',
        variables: { colorPrimary: '#18181b' },
      },
    });
    instanceRef.current = inst;
    setInstance(inst);
    return inst;
  };

  // Auto-initialize onboarding when barber already has an account but isn't connected
  useEffect(() => {
    if (accountId && !connected && mode === 'loading') {
      void initInstance().then(() => setMode('onboarding'));
    }
  }, []);

  const handleStart = async () => {
    setMode('loading');
    try {
      await api.post('/pro/stripe/create-account');
      await initInstance();
      setMode('onboarding');
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setMode('idle');
    }
  };

  const handleShowPayouts = async () => {
    setMode('loading');
    try {
      await initInstance();
      setMode('payouts');
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setMode('idle');
    }
  };

  const handleExit = async () => {
    try {
      const { data } = await api.post<{ connected: boolean }>('/pro/stripe/verify');
      if (data.connected) {
        toast.success('Conta Stripe ativada com sucesso! ✅');
        onConnected();
      } else {
        toast.show('Podes continuar o registo mais tarde.');
        setMode('idle');
      }
    } catch {
      setMode('idle');
    }
  };

  if (mode === 'loading') {
    return (
      <div className="flex items-center gap-2 py-3">
        <Spinner />
        <span className="text-sm text-muted">A carregar...</span>
      </div>
    );
  }

  if ((mode === 'onboarding' || mode === 'payouts') && instance) {
    return (
      <ConnectComponentsProvider connectInstance={instance}>
        {mode === 'onboarding' ? (
          <ConnectAccountOnboarding onExit={() => void handleExit()} />
        ) : (
          <ConnectPayouts />
        )}
      </ConnectComponentsProvider>
    );
  }

  // idle — connected or no account yet
  if (connected) {
    return (
      <button className="btn-secondary" onClick={() => void handleShowPayouts()}>
        Gerir Payouts
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Configura os teus recebimentos para aceitar pagamentos diretamente dos clientes. Feito
        dentro da app, sem sair para o Stripe.
      </p>
      <button className="btn-primary" onClick={() => void handleStart()}>
        Configurar recebimentos
      </button>
    </div>
  );
}
