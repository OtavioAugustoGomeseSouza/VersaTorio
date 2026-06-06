import { useState } from 'react';
import AppLink from '../components/AppLink';
import { useToast } from '../components/ToastProvider';
import { apiRequest } from '../lib/api';
import { navigate } from '../lib/router';

export default function LoginPage({ onAuthenticated }) {
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (!response?.access_token) {
        throw new Error('Token de acesso não retornado pelo backend');
      }

      onAuthenticated(response.access_token);
      navigate('/dashboard');
    } catch (error) {
      notify(error.message ?? 'Falha ao fazer login', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Entrar</h1>
        <p className="muted">Acesse para gerenciar banco de questões e provas.</p>

        <form onSubmit={handleSubmit} className="form-grid">
          <label htmlFor="login-email">E-mail</label>
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

        <p className="inline-tip">
          Não possui conta? <AppLink to="/register">Cadastrar</AppLink>
        </p>
      </section>
    </main>
  );
}
