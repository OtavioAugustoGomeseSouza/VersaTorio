import { useState } from 'react';
import AppLink from '../components/AppLink';
import { useToast } from '../components/ToastProvider';
import { apiRequest } from '../lib/api';
import { navigate } from '../lib/router';

export default function RegisterPage({ onAuthenticated }) {
  const { notify } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          name: name.trim() || undefined,
          email,
          password,
        },
      });

      if (!response?.access_token) {
        throw new Error('Token de acesso não retornado pelo backend');
      }

      onAuthenticated(response.access_token);
      navigate('/dashboard');
    } catch (error) {
      notify(error.message ?? 'Falha ao cadastrar usuário', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Criar conta</h1>
        <p className="muted">Cadastre-se para criar disciplinas, questões e provas.</p>

        <form onSubmit={handleSubmit} className="form-grid">
          <label htmlFor="register-name">Nome (opcional)</label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <label htmlFor="register-email">E-mail</label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="register-password">Senha</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </button>
        </form>

        <p className="inline-tip">
          Já possui conta? <AppLink to="/login">Entrar</AppLink>
        </p>
      </section>
    </main>
  );
}
