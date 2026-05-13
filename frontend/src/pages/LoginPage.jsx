import { useState } from 'react';
import AppLink from '../components/AppLink';
import { apiRequest } from '../lib/api';
import { navigate } from '../lib/router';

export default function LoginPage({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (!response?.access_token) {
        throw new Error('Token de acesso nao retornado pelo backend');
      }

      onAuthenticated(response.access_token);
      navigate('/dashboard');
    } catch (error) {
      setMessage(error.message ?? 'Falha ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Entrar</h1>
        <p className="muted">Acesse para gerenciar banco de questoes e provas.</p>

        <form onSubmit={handleSubmit} className="form-grid">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {message ? <p className="feedback error">{message}</p> : null}

        <p className="inline-tip">
          Nao possui conta? <AppLink to="/register">Cadastrar</AppLink>
        </p>
      </section>
    </main>
  );
}
