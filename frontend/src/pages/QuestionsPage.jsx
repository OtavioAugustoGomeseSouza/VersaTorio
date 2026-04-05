import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';

function optionLetter(index) {
  return String.fromCharCode(65 + index);
}

function createAlternativeDraft() {
  return {
    id: `alt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: '',
    type: 'TEXT',
    isCorrect: false,
  };
}

export default function QuestionsPage({ token, onUnauthorized }) {
  const [disciplines, setDisciplines] = useState([]);
  const [topicsByDiscipline, setTopicsByDiscipline] = useState({});
  const [questions, setQuestions] = useState([]);

  const [showDisciplineModal, setShowDisciplineModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  const [disciplineName, setDisciplineName] = useState('');
  const [createTopicWithDiscipline, setCreateTopicWithDiscipline] = useState(false);
  const [disciplineInitialTopicName, setDisciplineInitialTopicName] = useState('');
  const [topicName, setTopicName] = useState('');
  const [topicDisciplineId, setTopicDisciplineId] = useState('');
  const [selectedDisciplineFilterId, setSelectedDisciplineFilterId] = useState('');

  const [questionDisciplineId, setQuestionDisciplineId] = useState('');
  const [questionTopicId, setQuestionTopicId] = useState('');
  const [questionType, setQuestionType] = useState('MULTIPLE_CHOICE');
  const [questionText, setQuestionText] = useState('');
  const [questionAlternatives, setQuestionAlternatives] = useState([
    createAlternativeDraft(),
    createAlternativeDraft(),
  ]);

  const [loading, setLoading] = useState(false);
  const [savingDiscipline, setSavingDiscipline] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [message, setMessage] = useState('');

  const allTopics = useMemo(
    () => Object.values(topicsByDiscipline).flat(),
    [topicsByDiscipline],
  );

  const topicById = useMemo(() => {
    const result = {};
    allTopics.forEach((topic) => {
      result[topic.id] = topic;
    });
    return result;
  }, [allTopics]);

  const disciplineById = useMemo(() => {
    const result = {};
    disciplines.forEach((discipline) => {
      result[discipline.id] = discipline;
    });
    return result;
  }, [disciplines]);

  const topicsFromQuestionDiscipline =
    topicsByDiscipline[questionDisciplineId] ?? [];

  const filteredQuestions = useMemo(() => {
    if (!selectedDisciplineFilterId) {
      return questions;
    }

    return questions.filter((question) => {
      const topic = topicById[question.topicId];
      return topic?.disciplineId === selectedDisciplineFilterId;
    });
  }, [questions, selectedDisciplineFilterId, topicById]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      const [disciplinesData, questionsData] = await Promise.all([
        apiRequest('/disciplines', { token }),
        apiRequest('/questions', { token }),
      ]);

      const topicsPairs = await Promise.all(
        disciplinesData.map(async (discipline) => {
          const topicsData = await apiRequest(
            `/disciplines/${discipline.id}/topics`,
            { token },
          );
          return [discipline.id, topicsData];
        }),
      );

      setDisciplines(disciplinesData);
      setTopicsByDiscipline(Object.fromEntries(topicsPairs));
      setQuestions(questionsData);
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao carregar banco de questões');
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (disciplines.length === 0) {
      setSelectedDisciplineFilterId('');
      return;
    }

    if (
      selectedDisciplineFilterId &&
      !disciplines.some((discipline) => discipline.id === selectedDisciplineFilterId)
    ) {
      setSelectedDisciplineFilterId('');
    }
  }, [disciplines, selectedDisciplineFilterId]);

  function openDisciplineModal() {
    setDisciplineName('');
    setCreateTopicWithDiscipline(false);
    setDisciplineInitialTopicName('');
    setShowDisciplineModal(true);
  }

  function openTopicModalForDiscipline(disciplineId) {
    if (!disciplineId) {
      return;
    }

    setTopicName('');
    setTopicDisciplineId(disciplineId);
    setShowTopicModal(true);
  }

  function openQuestionModal() {
    if (disciplines.length === 0 || allTopics.length === 0) {
      return;
    }

    const selectedTopics = topicsByDiscipline[selectedDisciplineFilterId] ?? [];
    const fallbackDiscipline = disciplines.find(
      (discipline) => (topicsByDiscipline[discipline.id] ?? []).length > 0,
    );
    const initialDisciplineId =
      selectedTopics.length > 0
        ? selectedDisciplineFilterId
        : fallbackDiscipline?.id ?? disciplines[0].id;
    const initialTopicId = (topicsByDiscipline[initialDisciplineId] ?? [])[0]?.id;

    setQuestionDisciplineId(initialDisciplineId);
    setQuestionTopicId(initialTopicId ?? '');
    setQuestionType('MULTIPLE_CHOICE');
    setQuestionText('');
    setQuestionAlternatives([createAlternativeDraft(), createAlternativeDraft()]);
    setShowQuestionModal(true);
  }

  function closeAllModals() {
    setShowDisciplineModal(false);
    setShowTopicModal(false);
    setShowQuestionModal(false);
  }

  function handleQuestionDisciplineChange(nextDisciplineId) {
    setQuestionDisciplineId(nextDisciplineId);
    const nextTopics = topicsByDiscipline[nextDisciplineId] ?? [];
    setQuestionTopicId(nextTopics[0]?.id ?? '');
  }

  function addAlternativeDraft() {
    setQuestionAlternatives((current) => [...current, createAlternativeDraft()]);
  }

  function removeAlternativeDraft(alternativeId) {
    setQuestionAlternatives((current) =>
      current.filter((alternative) => alternative.id !== alternativeId),
    );
  }

  function updateAlternativeDraft(alternativeId, changes) {
    setQuestionAlternatives((current) =>
      current.map((alternative) =>
        alternative.id === alternativeId
          ? { ...alternative, ...changes }
          : alternative,
      ),
    );
  }

  async function handleCreateDiscipline(event) {
    event.preventDefault();

    if (!disciplineName.trim()) {
      return;
    }

    setSavingDiscipline(true);
    setMessage('');

    try {
      const createdDiscipline = await apiRequest('/disciplines', {
        method: 'POST',
        token,
        body: {
          name: disciplineName.trim(),
        },
      });

      if (createTopicWithDiscipline && disciplineInitialTopicName.trim()) {
        await apiRequest(`/disciplines/${createdDiscipline.id}/topics`, {
          method: 'POST',
          token,
          body: {
            name: disciplineInitialTopicName.trim(),
          },
        });
      }

      closeAllModals();
      setSelectedDisciplineFilterId(createdDiscipline.id);
      setMessage(
        createTopicWithDiscipline && disciplineInitialTopicName.trim()
          ? 'Disciplina e tópico criados com sucesso'
          : 'Disciplina criada com sucesso',
      );
      await loadData();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao criar disciplina');
    } finally {
      setSavingDiscipline(false);
    }
  }

  async function handleCreateTopic(event) {
    event.preventDefault();

    if (!topicDisciplineId || !topicName.trim()) {
      return;
    }

    setSavingTopic(true);
    setMessage('');

    try {
      await apiRequest(`/disciplines/${topicDisciplineId}/topics`, {
        method: 'POST',
        token,
        body: {
          name: topicName.trim(),
        },
      });

      closeAllModals();
      setMessage('Tópico criado com sucesso');
      await loadData();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao criar tópico');
    } finally {
      setSavingTopic(false);
    }
  }

  async function handleCreateQuestionWithAlternatives(event) {
    event.preventDefault();

    if (!questionTopicId || !questionText.trim()) {
      return;
    }

    const alternativesPayload = questionAlternatives
      .map((alternative) => ({
        text: alternative.text.trim(),
        type: alternative.type,
        isCorrect: alternative.isCorrect,
      }))
      .filter((alternative) => alternative.text.length > 0);

    if (alternativesPayload.length < 2) {
      setMessage('Adicione ao menos 2 alternativas com texto');
      return;
    }

    const correctCount = alternativesPayload.filter(
      (alternative) => alternative.isCorrect,
    ).length;

    if (correctCount < 1) {
      setMessage('Marque ao menos 1 alternativa correta');
      return;
    }

    if (questionType === 'TRUE_FALSE' && alternativesPayload.length !== 2) {
      setMessage('Para TRUE_FALSE, informe exatamente 2 alternativas');
      return;
    }

    setSavingQuestion(true);
    setMessage('');

    let createdQuestion;

    try {
      createdQuestion = await apiRequest('/questions', {
        method: 'POST',
        token,
        body: {
          text: questionText.trim(),
          type: questionType,
          topicId: questionTopicId,
        },
      });

      await Promise.all(
        alternativesPayload.map((alternative) =>
          apiRequest('/alternatives', {
            method: 'POST',
            token,
            body: {
              questionId: createdQuestion.id,
              text: alternative.text,
              type: alternative.type,
              isCorrect: alternative.isCorrect,
            },
          }),
        ),
      );

      closeAllModals();
      setMessage('Questão e alternativas criadas com sucesso');
      await loadData();
    } catch (error) {
      if (createdQuestion?.id) {
        try {
          await apiRequest(`/questions/${createdQuestion.id}`, {
            method: 'DELETE',
            token,
          });
        } catch {
          // noop
        }
      }

      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao criar questão com alternativas');
    } finally {
      setSavingQuestion(false);
    }
  }

  return (
    <div className="page-grid">
      <header>
        <h1>Banco de questões</h1>
        <p className="muted">
          Clique em uma disciplina para destacar e filtrar as questões pelos
          tópicos dela.
        </p>
      </header>

      {message ? <p className="feedback">{message}</p> : null}

      {loading ? <p>Carregando...</p> : null}

      <section className="kanban-grid">
        <article className="kanban-column card">
          <div className="kanban-column-header">
            <h2>Disciplinas</h2>
            <button type="button" className="icon-btn" onClick={openDisciplineModal}>
              +
            </button>
          </div>

          {disciplines.length === 0 ? <p>Nenhuma disciplina cadastrada.</p> : null}

          <div className="kanban-list">
            {disciplines.map((discipline) => {
              const topicsForDiscipline = topicsByDiscipline[discipline.id] ?? [];

              return (
                <article
                  key={discipline.id}
                  className={
                    selectedDisciplineFilterId === discipline.id
                      ? 'kanban-item discipline-card discipline-card-active'
                      : 'kanban-item discipline-card'
                  }
                  onClick={() =>
                    setSelectedDisciplineFilterId((currentId) =>
                      currentId === discipline.id ? '' : discipline.id,
                    )
                  }
                >
                  <div className="discipline-item-header">
                    <h3>{discipline.name}</h3>
                    <button
                      type="button"
                      className="icon-btn icon-btn-small"
                      onClick={(event) => {
                        event.stopPropagation();
                        openTopicModalForDiscipline(discipline.id);
                      }}
                    >
                      +
                    </button>
                  </div>
                  <p className="muted">Tópicos: {topicsForDiscipline.length}</p>
                  {topicsForDiscipline.length > 0 ? (
                    <ul className="topic-inline-list">
                      {topicsForDiscipline.map((topic) => (
                        <li key={topic.id}>{topic.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Sem tópicos cadastrados.</p>
                  )}
                </article>
              );
            })}
          </div>
        </article>

        <article className="kanban-column card">
          <div className="kanban-column-header">
            <h2>Questões</h2>
            <button
              type="button"
              className="icon-btn"
              onClick={openQuestionModal}
              disabled={disciplines.length === 0 || allTopics.length === 0}
            >
              +
            </button>
          </div>

          {filteredQuestions.length === 0 ? (
            <p>Nenhuma questão cadastrada para a disciplina selecionada.</p>
          ) : null}

          <div className="kanban-list">
            {filteredQuestions.map((question) => {
              const topic = topicById[question.topicId];
              const discipline = topic
                ? disciplineById[topic.disciplineId]
                : undefined;

              return (
                <article key={question.id} className="kanban-item">
                  <h3>{question.type}</h3>
                  <p>{question.text}</p>
                  <p className="muted">
                    Tópico: {topic?.name ?? '-'} | Disciplina:{' '}
                    {discipline?.name ?? '-'}
                  </p>

                  <ul className="compact-list">
                    {(question.alternatives ?? []).map((alternative, index) => (
                      <li key={alternative.id}>
                        {optionLetter(index)}. {alternative.text}{' '}
                        {alternative.isCorrect ? '(correta)' : ''}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </article>
      </section>

      {showDisciplineModal ? (
        <div className="modal-overlay" onClick={closeAllModals}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova disciplina</h2>
              <button type="button" className="ghost-btn" onClick={closeAllModals}>
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateDiscipline} className="form-grid">
              <label htmlFor="modal-discipline-name">Nome</label>
              <input
                id="modal-discipline-name"
                type="text"
                value={disciplineName}
                onChange={(event) => setDisciplineName(event.target.value)}
                required
              />

              <div className="spotlight-block">
                <label className="checkbox-label" htmlFor="create-topic-with-discipline">
                  <input
                    id="create-topic-with-discipline"
                    type="checkbox"
                    checked={createTopicWithDiscipline}
                    onChange={(event) =>
                      setCreateTopicWithDiscipline(event.target.checked)
                    }
                  />
                  Também criar um tópico agora
                </label>

                {createTopicWithDiscipline ? (
                  <label htmlFor="modal-discipline-initial-topic">
                    Primeiro tópico
                    <input
                      id="modal-discipline-initial-topic"
                      type="text"
                      value={disciplineInitialTopicName}
                      onChange={(event) =>
                        setDisciplineInitialTopicName(event.target.value)
                      }
                      placeholder="Ex.: Introdução"
                    />
                  </label>
                ) : null}
              </div>

              <button type="submit" disabled={savingDiscipline}>
                {savingDiscipline ? 'Salvando...' : 'Criar disciplina'}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {showTopicModal ? (
        <div className="modal-overlay" onClick={closeAllModals}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo tópico</h2>
              <button type="button" className="ghost-btn" onClick={closeAllModals}>
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="form-grid">
              <label htmlFor="modal-topic-discipline">Disciplina</label>
              <input
                id="modal-topic-discipline"
                type="text"
                value={disciplineById[topicDisciplineId]?.name ?? ''}
                disabled
              />

              <label htmlFor="modal-topic-name">Nome do tópico</label>
              <input
                id="modal-topic-name"
                type="text"
                value={topicName}
                onChange={(event) => setTopicName(event.target.value)}
                required
              />

              <button type="submit" disabled={savingTopic}>
                {savingTopic ? 'Salvando...' : 'Criar tópico'}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {showQuestionModal ? (
        <div className="modal-overlay" onClick={closeAllModals}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova questão com alternativas</h2>
              <button type="button" className="ghost-btn" onClick={closeAllModals}>
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateQuestionWithAlternatives} className="form-grid">
              <label htmlFor="modal-question-discipline">Disciplina</label>
              <select
                id="modal-question-discipline"
                value={questionDisciplineId}
                onChange={(event) =>
                  handleQuestionDisciplineChange(event.target.value)
                }
                required
              >
                {disciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>

              <label htmlFor="modal-question-topic">Tópico</label>
              <select
                id="modal-question-topic"
                value={questionTopicId}
                onChange={(event) => setQuestionTopicId(event.target.value)}
                required
              >
                {topicsFromQuestionDiscipline.length === 0 ? (
                  <option value="">Cadastre um tópico para essa disciplina</option>
                ) : (
                  topicsFromQuestionDiscipline.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))
                )}
              </select>

              <label htmlFor="modal-question-type">Tipo</label>
              <select
                id="modal-question-type"
                value={questionType}
                onChange={(event) => setQuestionType(event.target.value)}
              >
                <option value="MULTIPLE_CHOICE">MULTIPLE_CHOICE</option>
                <option value="TRUE_FALSE">TRUE_FALSE</option>
              </select>

              <label htmlFor="modal-question-text">Texto da questão</label>
              <textarea
                id="modal-question-text"
                rows={4}
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                required
              />

              <fieldset>
                <legend>Alternativas</legend>
                <div className="form-grid">
                  {questionAlternatives.map((alternative, index) => (
                    <div key={alternative.id} className="alt-row">
                      <label className="form-grid">
                        <span>Texto da alternativa {optionLetter(index)}</span>
                        <input
                          type="text"
                          value={alternative.text}
                          onChange={(event) =>
                            updateAlternativeDraft(alternative.id, {
                              text: event.target.value,
                            })
                          }
                          placeholder="Digite a alternativa"
                        />
                      </label>

                      <label className="form-grid">
                        <span>Tipo</span>
                        <select
                          value={alternative.type}
                          onChange={(event) =>
                            updateAlternativeDraft(alternative.id, {
                              type: event.target.value,
                            })
                          }
                        >
                          <option value="TEXT">TEXT</option>
                          <option value="IMAGE">IMAGE</option>
                        </select>
                      </label>

                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={alternative.isCorrect}
                          onChange={(event) =>
                            updateAlternativeDraft(alternative.id, {
                              isCorrect: event.target.checked,
                            })
                          }
                        />
                        Correta
                      </label>

                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => removeAlternativeDraft(alternative.id)}
                        disabled={questionAlternatives.length <= 2}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>

                <button type="button" className="ghost-btn" onClick={addAlternativeDraft}>
                  Adicionar alternativa
                </button>
              </fieldset>

              <button
                type="submit"
                disabled={savingQuestion || !questionTopicId}
              >
                {savingQuestion ? 'Salvando...' : 'Criar questão'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
