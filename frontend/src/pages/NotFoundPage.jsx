import AppLink from '../components/AppLink';

export default function NotFoundPage() {
  return (
    <div className="page-grid">
      <h1>Pagina nao encontrada</h1>
      <p className="muted">Verifique o endereco ou volte para o painel principal.</p>
      <AppLink to="/dashboard">Ir para dashboard</AppLink>
    </div>
  );
}
