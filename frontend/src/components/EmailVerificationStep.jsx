import { CheckCircle2, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { Spinner } from './Spinner.jsx';

export function EmailVerificationStep({
  email,
  emailMasque,
  emailEnvoye = true,
  onVerified,
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(emailEnvoye
    ? 'Le code vient d’être envoyé.'
    : 'L’envoi initial a échoué. Vous pourrez demander un nouveau code.');
  const [secondes, setSecondes] = useState(60);

  useEffect(() => {
    if (secondes <= 0) return undefined;
    const timer = window.setTimeout(() => setSecondes((valeur) => Math.max(0, valeur - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [secondes]);

  async function confirmer(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest('/auth/verification-email/confirmer', {
        method: 'POST',
        body: { email, code },
      });
      setMessage('Adresse e-mail confirmée.');
      await onVerified?.(response.donnees);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function renvoyer() {
    setResending(true);
    setError('');
    try {
      await apiRequest('/auth/verification-email/renvoyer', {
        method: 'POST',
        body: { email },
      });
      setMessage('Un nouveau code vient d’être envoyé.');
      setSecondes(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return <section className="email-verification-card">
    <span className="email-verification-card__icon"><MailCheck /></span>
    <small>Protection du compte</small>
    <h2>Confirmez votre adresse e-mail</h2>
    <p>Entrez le code à six chiffres envoyé à <strong>{emailMasque || email}</strong>. S’il n’apparaît pas dans la boîte de réception, consultez aussi les dossiers <strong>Spam</strong> et <strong>Messages indésirables</strong>.</p>
    {message && <div className="verification-notice"><CheckCircle2 />{message}</div>}
    {error && <div className="alert alert--error">{error}</div>}
    <form onSubmit={confirmer}>
      <label htmlFor="email-verification-code">Code de confirmation</label>
      <input
        id="email-verification-code"
        className="verification-code-input"
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength="6"
        placeholder="000000"
        aria-describedby="verification-help"
        autoFocus
        required
      />
      <small id="verification-help"><ShieldCheck />Ce code expire après 10 minutes et ne doit jamais être partagé.</small>
      <button className="button button--full button--large" disabled={loading || code.length !== 6}>
        {loading ? <Spinner /> : 'Confirmer mon e-mail'}
      </button>
    </form>
    <button className="verification-resend" type="button" disabled={resending || secondes > 0} onClick={renvoyer}>
      {resending ? <Spinner /> : <RefreshCw />}
      {secondes > 0 ? `Renvoyer dans ${secondes} s` : 'Renvoyer un nouveau code'}
    </button>
  </section>;
}
