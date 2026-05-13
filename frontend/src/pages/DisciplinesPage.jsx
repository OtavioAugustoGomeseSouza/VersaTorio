import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export default function DisciplinesPage({ token, onUnauthorized }) {
  const [disciplines, setDisciplines] = useState([]);
  const [topicCountByDiscipline, setTopicCountByDiscipline] = useState({});
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadDisciplines = useCallback(async () => {
    setLoading(true);
    setMessage('');

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
      setMessage(error.message ?? 'Erro ao carregar disciplinas');
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    loadDisciplines();
  }, [loadDisciplines]);

  async function handleCreateDiscipline(event) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await apiRequest('/disciplines', {
        method: 'POST',
        token,
        body: { name: name.trim() },
      });
      setName('');
      setMessage('Disciplina criada com sucesso');
      await loadDisciplines();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao criar disciplina');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDiscipline(id) {
    const confirmed = window.confirm('Deseja remover esta disciplina?');
    if (!confirmed) {
      return;
    }

    setMessage('');

    try {
      await apiRequest(`/disciplines/${id}`, {
        method: 'DELETE',
        token,
      });
      setMessage('Disciplina removida');
      await loadDisciplines();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao remover disciplina');
    }
  }

  return (
    <div className="page-grid">
      <header>
        <h1>Disciplinas</h1>
        <p className="muted">Crie e gerencie as disciplinas principais do banco de questoes.</p>
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

      {message ? <p className="feedback">{message}</p> : null}

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
                <th>Topicos</th>
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
