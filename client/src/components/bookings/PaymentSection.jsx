import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createPaymentOrder,
  verifyPayment,
  payAtHotel,
} from '../../features/bookings/bookingsSlice';
import { formatCurrency } from '../../utils/format';
import Button from '../ui/Button';
import { Spinner } from '../ui/Loading';

const METHODS = [
  { id: 'upi', label: 'UPI', hint: 'GPay, PhonePe, Paytm', icon: '📱' },
  { id: 'card', label: 'Credit / Debit Card', hint: 'Visa, Mastercard, RuPay', icon: '💳' },
  { id: 'netbanking', label: 'Net Banking', hint: 'All major banks', icon: '🏦' },
  { id: 'wallet', label: 'Wallets', hint: 'Paytm, Amazon Pay…', icon: '👛' },
  { id: 'pay_at_hotel', label: 'Pay at Hotel', hint: 'Pay on check-in', icon: '🏨' },
];

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Yes Bank', 'Other'];
const WALLETS = ['PhonePe Wallet', 'Paytm Wallet', 'Amazon Pay', 'Mobikwik', 'Freecharge'];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Payment step for a pending booking. Works in the app's MOCK payment mode:
 * a realistic gateway flow (method form → processing → verification) with no
 * real money moved. "Pay at Hotel" confirms the booking directly with the
 * amount collected on check-in.
 */
export default function PaymentSection({ booking, onSuccess }) {
  const dispatch = useDispatch();
  const { payStatus, payError } = useSelector((s) => s.bookings);
  const [method, setMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [bank, setBank] = useState(BANKS[0]);
  const [wallet, setWallet] = useState(WALLETS[0]);
  const [phase, setPhase] = useState('form'); // form | processing | failed
  const [localError, setLocalError] = useState('');

  if (!booking) return null;
  const total = Number(booking.pricing?.total || 0);
  const isPayAtHotel = method === 'pay_at_hotel';
  const busy = phase === 'processing' || payStatus === 'creating_order' || payStatus === 'verifying' || payStatus === 'paying';

  const validateForm = () => {
    if (method === 'upi' && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
      return 'Enter a valid UPI ID (e.g. yourname@ybl)';
    }
    if (method === 'card') {
      const digits = cardNumber.replace(/\s+/g, '');
      if (digits.length < 12 || !/^\d+$/.test(digits)) return 'Enter a valid card number';
      if (cardName.trim().length < 3) return 'Enter the name on the card';
      if (!/^\d{2}\s?\/\s?\d{2}$/.test(cardExpiry)) return 'Enter expiry as MM/YY';
      if (!/^\d{3,4}$/.test(cardCvv)) return 'Enter a valid CVV';
    }
    return '';
  };

  const handlePay = async () => {
    const formError = validateForm();
    if (formError) {
      setLocalError(formError);
      return;
    }
    setLocalError('');
    setPhase('processing');

    try {
      if (isPayAtHotel) {
        const res = await dispatch(payAtHotel(booking._id));
        if (res.meta.requestStatus === 'fulfilled') {
          onSuccess(res.payload);
          return;
        }
        setPhase('failed');
        setLocalError(res.payload || 'Could not confirm your booking');
        return;
      }

      const orderRes = await dispatch(createPaymentOrder(booking._id));
      if (orderRes.meta.requestStatus !== 'fulfilled') {
        setPhase('failed');
        setLocalError(orderRes.payload || 'Could not start a payment session');
        return;
      }
      const order = orderRes.payload;
      if (order?.isMock === false) {
        setPhase('failed');
        setLocalError('Real gateway checkout is not configured in this environment. Please use "Pay at Hotel" or contact support.');
        return;
      }

      // Simulate the payment gateway round-trip (dev / mock mode only).
      await delay(1900);
      const paymentId = `mock_${Math.random().toString(36).slice(2, 12)}`;
      const verifyRes = await dispatch(verifyPayment({
        bookingId: booking._id,
        paymentId,
        orderId: order.orderId,
        signature: 'mock_payment',
      }));
      if (verifyRes.meta.requestStatus === 'fulfilled') {
        onSuccess(verifyRes.payload);
        return;
      }
      setPhase('failed');
      setLocalError(verifyRes.payload || 'Payment verification failed');
    } catch {
      setPhase('failed');
      setLocalError('Something went wrong while processing your payment.');
    }
  };
if (phase === 'processing') {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-brand-100 bg-brand-50/50 px-6 py-14 text-center">
        <div className="relative">
          <Spinner label="Processing payment" className="py-0" />
          <span className="absolute inset-0 -m-3 flex items-center justify-center text-2xl opacity-60" aria-hidden="true">
            🔒
          </span>
        </div>
        <p className="mt-5 font-display text-base font-bold text-ink-900">Processing your payment…</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Securely contacting your bank
          {isPayAtHotel ? ' hotel' : method === 'upi' ? ' via UPI' : method === 'card' ? ' for card payment' : method === 'netbanking' ? ` (${bank})` : ' wallet'}.
          Please do not close this window.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-ink-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" style={{ animationDelay: '200ms' }} />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" style={{ animationDelay: '400ms' }} />
          Encrypting &amp; verifying · 256-bit SSL
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Choose a payment method</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => { setMethod(m.id); setLocalError(''); }}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              method === m.id
                ? 'border-brand-500 bg-brand-50/70 shadow-sm'
                : 'border-ink-100 bg-white hover:border-brand-200 hover:bg-sand-50/50'
            }`}
          >
            <span className="flex items-start justify-between">
              <span className="text-2xl" aria-hidden="true">{m.icon}</span>
              <span className={`mt-0.5 inline-block h-4 w-4 rounded-full border-2 ${method === m.id ? 'border-brand-600 bg-brand-600' : 'border-ink-300 bg-white'}`} aria-hidden="true">
                {method === m.id && (
                  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 text-white" aria-hidden="true">
                    <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </span>
            <span className="mt-2 block text-sm font-bold text-ink-900">{m.label}</span>
            <span className="mt-0.5 block text-xs text-ink-500">{m.hint}</span>
          </button>
        ))}
      </div>

      {/* Method-specific fields */}
      <div className="rounded-xl border border-ink-100 bg-sand-50/50 p-4">
        {method === 'upi' && (
          <div>
            <label htmlFor="upi-id" className="label-base">UPI ID</label>
            <input
              id="upi-id"
              className="input-base"
              placeholder="yourname@ybl"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              autoComplete="off"
            />
            <p className="mt-1.5 text-xs text-ink-500">Your VPA will open a collect request on your UPI app.</p>
          </div>
        )}
        {method === 'card' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="card-number" className="label-base">Card number</label>
              <input
                id="card-number"
                className="input-base"
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                autoComplete="cc-number"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="card-name" className="label-base">Name on card</label>
              <input id="card-name" className="input-base" placeholder="As shown on card" value={cardName} onChange={(e) => setCardName(e.target.value)} autoComplete="cc-name" />
            </div>
            <div>
              <label htmlFor="card-expiry" className="label-base">Expiry</label>
              <input id="card-expiry" className="input-base" placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} autoComplete="cc-exp" />
            </div>
            <div>
              <label htmlFor="card-cvv" className="label-base">CVV</label>
              <input id="card-cvv" className="input-base" placeholder="•••" type="password" maxLength={4} value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} autoComplete="cc-csc" />
            </div>
          </div>
        )}
        {method === 'netbanking' && (
          <div>
            <label htmlFor="bank-select" className="label-base">Select your bank</label>
            <select id="bank-select" className="input-base" value={bank} onChange={(e) => setBank(e.target.value)}>
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-ink-500">You will be redirected to {bank} to complete the payment.</p>
          </div>
        )}
        {method === 'wallet' && (
          <div>
            <label htmlFor="wallet-select" className="label-base">Select a wallet</label>
            <select id="wallet-select" className="input-base" value={wallet} onChange={(e) => setWallet(e.target.value)}>
              {WALLETS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        )}
        {method === 'pay_at_hotel' && (
          <div className="flex items-start gap-3 text-sm text-ink-600">
            <span className="text-lg" aria-hidden="true">🛎️</span>
            <p>
              Your booking will be <strong className="text-ink-900">confirmed instantly</strong> and you will pay{' '}
              <strong className="text-ink-900">{formatCurrency(total)}</strong> directly at the hotel reception during check-in.
            </p>
          </div>
        )}
      </div>

      {(localError || payError) && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {localError || payError}
        </div>
      )}

      {phase === 'failed' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-semibold text-red-700">Payment failed</p>
          <p className="mt-1 text-sm text-red-600">{localError || 'The payment could not be completed. Please try again.'}</p>
          <p className="mt-1 text-xs text-red-500">No money was deducted. Your booking is still reserved (pending payment).</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => { setPhase('form'); setLocalError(''); }}>Try again</Button>
            <Button variant="ghost" size="sm" onClick={() => { setPhase('form'); setMethod('pay_at_hotel'); setLocalError(''); }}>Or pay at hotel</Button>
          </div>
        </div>
      ) : (
        <Button size="lg" className="w-full" onClick={handlePay} disabled={busy}>
          <span className="mr-1" aria-hidden="true">{isPayAtHotel ? '🛎️' : '🔒'}</span>
          {isPayAtHotel ? `Confirm booking · Pay ${formatCurrency(total)} at property` : `Pay ${formatCurrency(total)} securely`}
        </Button>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1">✅&nbsp;Free cancellation available</span>
        <span className="inline-flex items-center gap-1">🔐&nbsp;256-bit SSL secure</span>
        <span>•</span>
        <span>Mock payment mode — no real money charged</span>
      </div>
    </div>
  );
}