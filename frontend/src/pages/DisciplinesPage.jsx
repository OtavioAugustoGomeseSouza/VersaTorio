import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../components/ToastProvider';
import { apiRequest } from '../lib/api';

export default function DisciplinesPage({ token, onUnauthorized }) {
  const { notify } = useToast();
  const [disciplines, setDisciplines] = useState([]);
  const [topicCountByDiscipline, setTopicCountByDiscipline] = useState({});
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDisciplines = useCallback(async () => {
    setLoading(true);

    try {
      const data = await apiRequest('/disciplines', { token });
      const topicsLists = await Promise.all(
        data.map((discipline) =>
          apiRequest(`/disciplines/${discipline.id}/topics`, { token }),
        ),
      );

      const topicCounts = {};
      data.forEach((discipline, index) => {
        topicCounts[discipline.id] = topicsLists[index].length;
      });

      setDisciplines(data);
      setTopicCountByDiscipline(topicCounts);
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      notify(error.message ?? 'Erro ao carregar disciplinas', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized, notify]);

  useEffect(() => {
    loadDisciplines();
  }, [loadDisciplines]);

  async function handleCreateDiscipline(event) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setSaving(true);

    try {
      await apiRequest('/disciplines', {
        method: 'POST',
        token,
        body: { name: name.trim() },
      });
      setName('');
      notify('Disciplina criada com sucesso', 'success');
      await loadDisciplines();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      notify(error.message ?? 'Erro ao criar disciplina', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDiscipline(id) {
    const confirmed = window.confirm('Deseja remover esta disciplina?');
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/disciplines/${id}`, {
        method: 'DELETE',
        token,
      });
      notify('Disciplina removida', 'success');
      await loadDisciplines();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      notify(error.message ?? 'Erro ao remover disciplina', 'error');
    }
  }

  return (
    <div className="page-grid">
      <header>
        <h1>Disciplinas</h1>
        <p className="muted">Crie e gerencie as disciplinas principais do banco de questões.</p>
      </header>

      <section className="card">
        <h2>Nova disciplina</h2>
        <form onSubmit={handleCreateDiscipline} className="form-grid">
          <label htmlFor="discipline-name">Nome</label>
          <input
            id="discipline-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Criar disciplina'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Lista de disciplinas</h2>
        {loading ? <p>Carregando...</p> : null}

        {!loading && disciplines.length === 0 ? (
          <p>Nenhuma disciplina cadastrada.</p>
        ) : null}

        {!loading && disciplines.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tópicos</th>
                <th>Criada em</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {disciplines.map((discipline) => (
                <tr key={discipline.id}>
                  <td>{discipline.name}</td>
                  <td>{topicCountByDiscipline[discipline.id] ?? 0}</td>
                  <td>{new Date(discipline.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleDeleteDiscipline(discipline.id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
}
