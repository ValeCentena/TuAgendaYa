import { useEffect, useRef, useState } from 'react';

const API_BASE = 'https://tuagendaya-api.onrender.com/api';

function loadMercadoPagoSdk() {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) {
      resolve(window.MercadoPago);
      return;
    }

    const existing = document.querySelector('script[data-mercadopago-sdk="true"]');

    if (existing) {
      existing.addEventListener('load', () => resolve(window.MercadoPago));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.dataset.mercadopagoSdk = 'true';
    script.onload = () => resolve(window.MercadoPago);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function getPublicKey() {
  const response = await fetch(`${API_BASE}/bookings/public/payment/mercadopago/public-key`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.publicKey) {
    throw new Error(data.error || 'No se pudo cargar el formulario de pago.');
  }

  return data.publicKey;
}

export default function CardPaymentBrick({ amount, disabled, onSubmitPayment }) {
  const controllerRef = useRef(null);
  const onSubmitPaymentRef = useRef(onSubmitPayment);
  const containerIdRef = useRef(`tuagendaya-card-payment-${Math.random().toString(36).slice(2)}`);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onSubmitPaymentRef.current = onSubmitPayment;
  }, [onSubmitPayment]);

  useEffect(() => {
    let cancelled = false;
    let mountedController = null;

    const destroy = async () => {
      if (controllerRef.current) {
        try {
          await controllerRef.current.unmount();
        } catch (_) {}
        controllerRef.current = null;
      }
    };

    const mount = async () => {
      if (!amount || Number(amount) <= 0 || disabled) {
        await destroy();
        setReady(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        setReady(false);
        await destroy();

        const publicKey = await getPublicKey();
        const MercadoPago = await loadMercadoPagoSdk();

        if (cancelled) return;

        const mp = new MercadoPago(publicKey, { locale: 'es-UY' });
        const bricksBuilder = mp.bricks();

        mountedController = await bricksBuilder.create('cardPayment', containerIdRef.current, {
          initialization: {
            amount: Number(amount),
          },
          customization: {
            visual: {
              style: {
                theme: 'default',
              },
            },
            paymentMethods: {
              maxInstallments: 1,
            },
          },
          callbacks: {
            onReady: () => {
              if (cancelled) return;
              setReady(true);
              setLoading(false);
            },
            onSubmit: async (cardFormData) => {
              setError('');
              if (!onSubmitPaymentRef.current) {
                throw new Error('No se pudo procesar el pago.');
              }

              await onSubmitPaymentRef.current(cardFormData);
            },
            onError: (brickError) => {
              console.error('Mercado Pago Brick error:', brickError);
              if (cancelled) return;
              setError('No se pudo cargar el formulario de tarjeta.');
              setLoading(false);
            },
          },
        });

        if (cancelled) {
          try {
            await mountedController.unmount();
          } catch (_) {}
          return;
        }

        controllerRef.current = mountedController;
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'No se pudo cargar el formulario de tarjeta.');
          setLoading(false);
        }
      }
    };

    mount();

    return () => {
      cancelled = true;

      if (mountedController && mountedController !== controllerRef.current) {
        mountedController.unmount?.().catch?.(() => {});
      }

      destroy();
    };
  }, [amount, disabled]);

  return (
    <div
      style={{
        marginTop: 14,
        marginBottom: 14,
        background: '#fff',
        border: '1px solid #e5e5ea',
        borderRadius: 18,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 900, color: '#1d1d1f', marginBottom: 6 }}>
        Pagar con tarjeta
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 650, color: '#6e6e73', lineHeight: 1.4, marginBottom: 12 }}>
        Ingresá los datos de tu tarjeta. TuAgendaYa no guarda número de tarjeta ni código de seguridad.
      </div>

      {loading && (
        <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 10 }}>
          Cargando formulario de pago...
        </div>
      )}

      {error && (
        <div style={{ fontSize: 13, color: '#ff3b30', fontWeight: 800, marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div id={containerIdRef.current} />

      {!ready && !loading && !error && (
        <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 8 }}>
          Completá los datos requeridos para habilitar el pago.
        </div>
      )}
    </div>
  );
}
