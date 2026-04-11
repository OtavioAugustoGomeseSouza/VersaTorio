import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL, apiRequest } from '../lib/api';

function createHeaderFieldId() {
  return `pdf-field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultHeaderFields() {
  return [
    { id: createHeaderFieldId(), label: 'Nome', value: '' },
    { id: createHeaderFieldId(), label: 'Data', value: '' },
  ];
}

function buildPdfFileName(version, exam) {
  const baseName = `${exam?.name ?? 'prova'}-${version.name}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `${baseName || 'prova'}.pdf`;
}

function AuthenticatedPdfPreview({ token, pdfUrl, title, onUnauthorized }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!pdfUrl) {
      setPreviewUrl('');
      setPreviewError('');
      return undefined;
    }

    let objectUrl = '';
    let isCancelled = false;

    async function loadPreview() {
      setPreviewLoading(true);
      setPreviewError('');
      setPreviewUrl('');

      try {
        const response = await fetch(`${API_URL}${pdfUrl}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (response.status === 401) {
          onUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(`Erro ao carregar prévia (${response.status})`);
        }

        const pdfBlob = await response.blob();
        objectUrl = URL.createObjectURL(pdfBlob);

        if (!isCancelled) {
          setPreviewUrl(objectUrl);
        }
      } catch (error) {
        if (!isCancelled) {
          setPreviewError(error.message ?? 'Erro ao carregar prévia do PDF');
        }
      } finally {
        if (!isCancelled) {
          setPreviewLoading(false);
        }
      }
    }

    loadPreview();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [token, pdfUrl, onUnauthorized]);

  if (previewLoading) {
    return <p className="muted">Carregando prévia...</p>;
  }

  if (previewError) {
    return <p className="feedback error">{previewError}</p>;
  }

  if (!previewUrl) {
    return null;
  }

  return <iframe className="pdf-preview-frame" src={previewUrl} title={title} />;
}

export default function VersionsPage({ token, onUnauthorized }) {
  const [exams, setExams] = useState([]);
  const [versions, setVersions] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [pdfVersion, setPdfVersion] = useState(null);
  const [pdfHeaderFields, setPdfHeaderFields] = useState(
    createDefaultHeaderFields,
  );
  const [pdfColumns, setPdfColumns] = useState(2);
  const [includeVersionInFooter, setIncludeVersionInFooter] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const examById = useMemo(() => {
    const result = {};
    exams.forEach((exam) => {
      result[exam.id] = exam;
    });
    return result;
  }, [exams]);

  const filteredVersions = useMemo(() => {
    if (!selectedExamId) {
      return versions;
    }

    return versions.filter((version) => version.examId === selectedExamId);
  }, [versions, selectedExamId]);

  const selectedVersion = filteredVersions.find(
    (version) => version.id === selectedVersionId,
  );

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

    if (!filteredVersions.some((version) => version.id === selectedVersionId)) {
      setSelectedVersionId('');
    }
  }, [filteredVersions, selectedVersionId]);

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

  function openPdfModal(version) {
    setPdfVersion(version);
    setPdfHeaderFields(createDefaultHeaderFields());
    setPdfColumns(2);
    setIncludeVersionInFooter(false);
    setMessage('');
  }

  function closePdfModal() {
    if (generatingPdf) {
      return;
    }

    setPdfVersion(null);
  }

  function addPdfHeaderField() {
    setPdfHeaderFields((currentFields) => [
      ...currentFields,
      { id: createHeaderFieldId(), label: '', value: '' },
    ]);
  }

  function updatePdfHeaderField(id, changes) {
    setPdfHeaderFields((currentFields) =>
      currentFields.map((field) =>
        field.id === id ? { ...field, ...changes } : field,
      ),
    );
  }

  function removePdfHeaderField(id) {
    setPdfHeaderFields((currentFields) =>
      currentFields.filter((field) => field.id !== id),
    );
  }

  async function downloadPdf(version, pdfUrl) {
    const response = await fetch(`${API_URL}${pdfUrl}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (response.status === 401) {
      onUnauthorized();
      return;
    }

    if (!response.ok) {
      throw new Error(`Erro ao baixar PDF (${response.status})`);
    }

    const pdfBlob = await response.blob();
    const objectUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = buildPdfFileName(version, examById[version.examId]);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  async function handleDownloadExistingPdf(version) {
    if (!version.pdfUrl) {
      return;
    }

    setMessage('');

    try {
      await downloadPdf(version, version.pdfUrl);
    } catch (error) {
      setMessage(error.message ?? 'Erro ao baixar PDF');
    }
  }

  async function handleGeneratePdf(event) {
    event.preventDefault();

    if (!pdfVersion) {
      return;
    }

    const headerFields = pdfHeaderFields
      .map((field) => ({
        label: field.label.trim(),
        value: field.value.trim(),
      }))
      .filter((field) => field.label.length > 0);

    if (headerFields.length === 0) {
      setMessage('Adicione ao menos um campo no cabeçalho do PDF');
      return;
    }

    setGeneratingPdf(true);
    setMessage('');

    try {
      const updatedVersion = await apiRequest(
        `/exam-versions/${pdfVersion.id}/generate-pdf`,
        {
          method: 'POST',
          token,
          body: {
            headerFields,
            columns: Number(pdfColumns),
            includeVersionInFooter,
          },
        },
      );

      setVersions((currentVersions) =>
        currentVersions.map((version) =>
          version.id === updatedVersion.id ? updatedVersion : version,
        ),
      );
      setSelectedVersionId(updatedVersion.id);
      setPdfVersion(null);
      setMessage('PDF gerado');

      if (updatedVersion.pdfUrl) {
        await downloadPdf(updatedVersion, updatedVersion.pdfUrl);
      }
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao gerar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }

  function handleVersionRowClick(event, versionId) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('button, a, input, select, textarea')) {
      return;
    }

    setSelectedVersionId(versionId);
  }

  function handleVersionRowKeyDown(event, versionId) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('button, a, input, select, textarea')
    ) {
      return;
    }

    event.preventDefault();
    setSelectedVersionId(versionId);
  }

  return (
    <div className="page-grid">
      <header>
        <h1>Versões de prova</h1>
      </header>

      <section className="card">
        <h2>Filtros</h2>

        <div className="form-grid">
          <label htmlFor="version-exam">Prova</label>
          <div className="input-with-action">
            <select
              id="version-exam"
              value={selectedExamId}
              onChange={(event) => setSelectedExamId(event.target.value)}
              disabled={exams.length === 0}
            >
              {exams.length === 0 ? (
                <option value="">Cadastre uma prova antes</option>
              ) : (
                <>
                  <option value="">Todas as provas</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            <button
              type="button"
              className="icon-btn icon-btn-small ghost-btn"
              onClick={() => setSelectedExamId('')}
              disabled={!selectedExamId}
              title="Limpar seleção de prova"
              aria-label="Limpar seleção de prova"
            >
              x
            </button>
          </div>
        </div>
      </section>

      {message ? <p className="feedback">{message}</p> : null}

      <section className="card">
        <h2>Versões geradas</h2>
        {loading ? <p>Carregando...</p> : null}

        {!loading && filteredVersions.length === 0 ? (
          <p>
            {selectedExamId
              ? 'Nenhuma versão gerada para a prova selecionada.'
              : 'Nenhuma versão gerada.'}
          </p>
        ) : null}

        {!loading && filteredVersions.length > 0 ? (
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
              {filteredVersions.map((version) => (
                <tr
                  key={version.id}
                  className="table-row-clickable"
                  tabIndex={0}
                  onClick={(event) => handleVersionRowClick(event, version.id)}
                  onKeyDown={(event) =>
                    handleVersionRowKeyDown(event, version.id)
                  }
                >
                  <td>{version.name}</td>
                  <td>{examById[version.examId]?.name ?? '-'}</td>
                  <td>{new Date(version.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="inline-actions">
                      <button
                        type="button"
                        onClick={() => openPdfModal(version)}
                      >
                        Gerar PDF
                      </button>
                      {version.pdfUrl ? (
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => handleDownloadExistingPdf(version)}
                        >
                          Baixar PDF
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() => handleDeleteVersion(version.id)}
                      >
                        Excluir
                      </button>
                    </div>
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
          <div className="inline-actions">
            <button type="button" onClick={() => openPdfModal(selectedVersion)}>
              Gerar PDF
            </button>
            {selectedVersion.pdfUrl ? (
              <button
                type="button"
                className="ghost-btn"
                onClick={() => handleDownloadExistingPdf(selectedVersion)}
              >
                Baixar PDF
              </button>
            ) : null}
          </div>
          <div className="pdf-preview-panel">
            <h3>Prévia da prova</h3>
            {selectedVersion.pdfUrl ? (
              <AuthenticatedPdfPreview
                token={token}
                pdfUrl={selectedVersion.pdfUrl}
                title={`Prévia da prova ${selectedVersion.name}`}
                onUnauthorized={onUnauthorized}
              />
            ) : (
              <p className="muted">Gere o PDF para ver a prévia da prova.</p>
            )}
          </div>
        </section>
      ) : null}

      {pdfVersion ? (
        <div className="modal-overlay" onClick={closePdfModal}>
          <section
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Gerar PDF</h2>
                <p className="muted">
                  {examById[pdfVersion.examId]?.name ?? '-'} | {pdfVersion.name}
                </p>
              </div>
              <button
                type="button"
                className="ghost-btn"
                onClick={closePdfModal}
                disabled={generatingPdf}
              >
                Fechar
              </button>
            </div>

            <form className="form-grid" onSubmit={handleGeneratePdf}>
              <fieldset className="pdf-config-section">
                <legend>Cabeçalho da prova</legend>

                <div className="pdf-header-fields">
                  {pdfHeaderFields.map((field, index) => (
                    <div key={field.id} className="pdf-header-field-row">
                      <label>
                        Campo {index + 1}
                        <input
                          type="text"
                          value={field.label}
                          onChange={(event) =>
                            updatePdfHeaderField(field.id, {
                              label: event.target.value,
                            })
                          }
                          placeholder="Ex.: Turma"
                          disabled={generatingPdf}
                        />
                      </label>
                      <label>
                        Valor impresso
                        <input
                          type="text"
                          value={field.value}
                          onChange={(event) =>
                            updatePdfHeaderField(field.id, {
                              value: event.target.value,
                            })
                          }
                          placeholder="Deixe em branco para linha de preenchimento"
                          disabled={generatingPdf}
                        />
                      </label>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => removePdfHeaderField(field.id)}
                        disabled={generatingPdf || pdfHeaderFields.length <= 1}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="ghost-btn"
                  onClick={addPdfHeaderField}
                  disabled={generatingPdf}
                >
                  + Adicionar campo
                </button>
              </fieldset>

              <fieldset className="pdf-config-section">
                <legend>Opções de impressão</legend>

                <div className="mode-selector">
                  <button
                    type="button"
                    className={`mode-btn ${pdfColumns === 1 ? 'mode-btn-active' : ''}`}
                    onClick={() => setPdfColumns(1)}
                    disabled={generatingPdf}
                  >
                    1 coluna
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${pdfColumns === 2 ? 'mode-btn-active' : ''}`}
                    onClick={() => setPdfColumns(2)}
                    disabled={generatingPdf}
                  >
                    2 colunas
                  </button>
                </div>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeVersionInFooter}
                    onChange={(event) =>
                      setIncludeVersionInFooter(event.target.checked)
                    }
                    disabled={generatingPdf}
                  />
                  Incluir versão?
                </label>
              </fieldset>

              <button type="submit" disabled={generatingPdf}>
                {generatingPdf ? 'Gerando PDF...' : 'Gerar PDF'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
