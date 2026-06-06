import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../components/ToastProvider';
import { apiRequest } from '../lib/api';

export default function TopicsPage({ token, onUnauthorized }) {
  const { notify } = useToast();
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState('');
  const [topics, setTopics] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDisciplines = useCallback(async () => {
    try {
      const data = await apiRequest('/disciplines', { token });
      setDisciplines(data);
      if (data.length > 0 && !selectedDisciplineId) {
        setSelectedDisciplineId(data[0].id);
      }
      if (data.length === 0) {
        setSelectedDisciplineId('');
      }
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      notify(error.message ?? 'Erro ao carregar disciplinas', 'error');
    }
  }, [token, onUnauthorized, selectedDisciplineId, notify]);

  const loadTopics = useCallback(async () => {
    if (!selectedDisciplineId) {
      setTopics([]);
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest(
        `/disciplines/${selectedDisciplineId}/topics`,
        { token },
      );
      setTopics(data);
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      notify(error.message ?? 'Erro ao carregar tópicos', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDisciplineId, token, onUnauthorized, notify]);

  useEffect(() => {
    loadDisciplines();
  }, [loadDisciplines]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  async function handleCreateTopic(event) {
    event.preventDefault();
    if (!selectedDisciplineId || !name.trim()) {
      return;
    }

    setSaving(true);

    try {
      await apiRequest(`/disciplines/${selectedDisciplineId}/topics`, {
        method: 'POST',
        token,
        body: { name: name.trim() },
      });
      setName('');
      notify('Tópico criado com sucesso', 'success');
      await loadTopics();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      notify(error.message ?? 'Erro ao criar tópico', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTopic(topicId) {
    const confirmed = window.confirm('Deseja remover este tópico?');
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/topics/${topicId}`, {
        method: 'DELETE',
        token,
      });
      notify('Tópico removido', 'success');
      await loadTopics();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      notify(error.message ?? 'Erro ao remover tópico', 'error');
    }
  }

  return (
    <div className="page-grid">
      <header>
        <h1>Matérias / Tópicos</h1>
        <p className="muted">Organize os tópicos dentro de cada disciplina.</p>
      </header>

      <section className="card">
        <h2>Selecionar disciplina</h2>
        <label htmlFor="topic-discipline-select">Disciplina</label>
        <select
          id="topic-discipline-select"
          value={selectedDisciplineId}
          onChange={(event) => setSelectedDisciplineId(event.target.value)}
          disabled={disciplines.length === 0}
        >
          {disciplines.length === 0 ? (
            <option value="">Cadastre uma disciplina primeiro</option>
          ) : (
            disciplines.map((discipline) => (
              <option key={discipline.id} value={discipline.id}>
                {discipline.name}
              </option>
            ))
          )}
        </select>
      </section>

      <section className="card">
        <h2>Novo tópico</h2>
        <form onSubmit={handleCreateTopic} className="form-grid">
          <label htmlFor="topic-name">Nome do tópico</label>
          <input
            id="topic-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <button
            type="submit"
            disabled={saving || disciplines.length === 0 || !selectedDisciplineId}
          >
            {saving ? 'Salvando...' : 'Criar tópico'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Lista de tópicos</h2>
        {loading ? <p>Carregando...</p> : null}

        {!loading && topics.length === 0 ? <p>Nenhum tópico cadastrado.</p> : null}

        {!loading && topics.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Criado em</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic.id}>
                  <td>{topic.name}</td>
                  <td>{new Date(topic.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleDeleteTopic(topic.id)}
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
