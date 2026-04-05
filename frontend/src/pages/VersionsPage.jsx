import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';

function buildVersionName(base, index) {
  const letter = String.fromCharCode(65 + index);
  return `${base} ${letter}`;
}

export default function VersionsPage({ token, onUnauthorized }) {
  const [exams, setExams] = useState([]);
  const [versions, setVersions] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [baseName, setBaseName] = useState('Versão');
  const [quantity, setQuantity] = useState(1);
  const [selectedVersionId, setSelectedVersionId] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const examById = useMemo(() => {
    const result = {};
    exams.forEach((exam) => {
      result[exam.id] = exam;
    });
    return result;
  }, [exams]);

  const selectedVersion = versions.find((version) => version.id === selectedVersionId);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      const [examsData, versionsData] = await Promise.all([
        apiRequest('/exams', { token }),
        apiRequest('/exam-versions', { token }),
      ]);

      const sortedVersions = [...versionsData].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      setExams(examsData);
      setVersions(sortedVersions);

      const examIdFromQuery =
        new URLSearchParams(window.location.search).get('examId') ?? '';
      const queryExamExists =
        examIdFromQuery.length > 0 &&
        examsData.some((exam) => exam.id === examIdFromQuery);

      setSelectedExamId((currentSelectedExamId) => {
        if (queryExamExists) {
          return examIdFromQuery;
        }

        if (
          currentSelectedExamId &&
          examsData.some((exam) => exam.id === currentSelectedExamId)
        ) {
          return currentSelectedExamId;
        }

        if (examsData.length > 0) {
          return examsData[0].id;
        }

        return '';
      });

      if (queryExamExists) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao carregar versões');
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedVersionId) {
      return;
    }

    if (!versions.some((version) => version.id === selectedVersionId)) {
      setSelectedVersionId('');
    }
  }, [versions, selectedVersionId]);

  async function handleGenerateVersions(event) {
    event.preventDefault();

    if (!selectedExamId || quantity < 1) {
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      for (let index = 0; index < quantity; index += 1) {
        await apiRequest('/exam-versions/generate', {
          method: 'POST',
          token,
          body: {
            examId: selectedExamId,
            name: buildVersionName(baseName.trim() || 'Versão', index),
          },
        });
      }

      setMessage('Versões geradas com sucesso');
      await loadData();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao gerar versões');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVersion(id) {
    const confirmed = window.confirm('Deseja remover esta versão?');
    if (!confirmed) {
      return;
    }

    setMessage('');

    try {
      await apiRequest(`/exam-versions/${id}`, {
        method: 'DELETE',
        token,
      });
      setMessage('Versão removida');
      await loadData();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao remover versão');
    }
  }

  return (
    <div className="page-grid">
      <header>
        <h1>Versões de prova</h1>
      </header>

      <section className="card">
        <h2>Gerar versões</h2>

        <form onSubmit={handleGenerateVersions} className="form-grid">
          <label htmlFor="version-exam">Prova</label>
          <select
            id="version-exam"
            value={selectedExamId}
            onChange={(event) => setSelectedExamId(event.target.value)}
            disabled={exams.length === 0}
          >
            {exams.length === 0 ? (
              <option value="">Cadastre uma prova antes</option>
            ) : (
              exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))
            )}
          </select>

          <label htmlFor="version-base-name">Prefixo do nome</label>
          <input
            id="version-base-name"
            type="text"
            value={baseName}
            onChange={(event) => setBaseName(event.target.value)}
            placeholder="Versão"
          />

          <label htmlFor="version-quantity">Quantidade</label>
          <input
            id="version-quantity"
            type="number"
            min={1}
            max={26}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value) || 1)}
          />

          <button type="submit" disabled={saving || exams.length === 0}>
            {saving ? 'Gerando...' : 'Gerar'}
          </button>
        </form>
      </section>

      {message ? <p className="feedback">{message}</p> : null}

      <section className="card">
        <h2>Versões geradas</h2>
        {loading ? <p>Carregando...</p> : null}

        {!loading && versions.length === 0 ? <p>Nenhuma versão gerada.</p> : null}

        {!loading && versions.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Prova</th>
                <th>Criada em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr key={version.id}>
                  <td>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setSelectedVersionId(version.id)}
                    >
                      {version.name}
                    </button>
                  </td>
                  <td>{examById[version.examId]?.name ?? '-'}</td>
                  <td>{new Date(version.createdAt).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleDeleteVersion(version.id)}
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

      {selectedVersion ? (
        <section className="card">
          <h2>Detalhes da versão: {selectedVersion.name}</h2>
          <p className="muted">
            Prova: {examById[selectedVersion.examId]?.name ?? '-'}
          </p>
          <pre className="json-block">
            {JSON.stringify(selectedVersion.orderData, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
