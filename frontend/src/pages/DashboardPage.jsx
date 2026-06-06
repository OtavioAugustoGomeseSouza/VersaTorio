import { useEffect, useState } from 'react';
import { useToast } from '../components/ToastProvider';
import { apiRequest } from '../lib/api';

export default function DashboardPage({ token, onUnauthorized }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    disciplines: 0,
    topics: 0,
    questions: 0,
    exams: 0,
    versions: 0,
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);

      try {
        const [disciplines, questions, exams, versions] = await Promise.all([
          apiRequest('/disciplines', { token }),
          apiRequest('/questions', { token }),
          apiRequest('/exams', { token }),
          apiRequest('/exam-versions', { token }),
        ]);

        const topicsByDiscipline = await Promise.all(
          disciplines.map((discipline) =>
            apiRequest(`/disciplines/${discipline.id}/topics`, { token }),
          ),
        );

        const topicsCount = topicsByDiscipline.reduce(
          (acc, list) => acc + list.length,
          0,
        );

        if (!active) {
          return;
        }

        setMetrics({
          disciplines: disciplines.length,
          topics: topicsCount,
          questions: questions.length,
          exams: exams.length,
          versions: versions.length,
        });
      } catch (requestError) {
        if (requestError.status === 401) {
          onUnauthorized();
          return;
        }

        if (active) {
          notify(requestError.message ?? 'Erro ao carregar dashboard', 'error');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [token, onUnauthorized, notify]);

  if (loading) {
    return <p>Carregando dashboard...</p>;
  }

  return (
    <div className="page-grid">
      <header>
        <h1>Dashboard</h1>
        <p className="muted">Visão geral das entidades principais do sistema.</p>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <h2>Disciplinas</h2>
          <p>{metrics.disciplines}</p>
        </article>
        <article className="stat-card">
          <h2>Matérias/Tópicos</h2>
          <p>{metrics.topics}</p>
        </article>
        <article className="stat-card">
          <h2>Questões</h2>
          <p>{metrics.questions}</p>
        </article>
        <article className="stat-card">
          <h2>Provas</h2>
          <p>{metrics.exams}</p>
        </article>
        <article className="stat-card">
          <h2>Versões</h2>
          <p>{metrics.versions}</p>
        </article>
      </section>
    </div>
  );
}
