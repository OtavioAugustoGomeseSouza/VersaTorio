import AppLink from './AppLink';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/questions', label: 'Banco de Questões' },
  { to: '/exams', label: 'Provas' },
  { to: '/versions', label: 'Versões' },
];

export default function AppShell({ currentPath, onLogout, children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Sistema de Provas</div>
        <button type="button" className="ghost-btn" onClick={onLogout}>
          Sair
        </button>
      </header>

      <div className="layout-grid">
        <aside className="sidebar">
          {links.map((link) => (
            <AppLink
              key={link.to}
              to={link.to}
              className={
                currentPath === link.to ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              {link.label}
            </AppLink>
          ))}
        </aside>

        <section className="content-area">{children}</section>
      </div>
    </div>
  );
}
