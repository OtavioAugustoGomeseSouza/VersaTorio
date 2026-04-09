import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import { navigate } from '../lib/router';

const QUESTION_SELECTION_MODE = {
  MANUAL: 'MANUAL',
  DRAW: 'DRAW',
};

function createDrawRule(topicId = '') {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    topicId,
    quantity: 1,
  };
}

export default function ExamsPage({ token, onUnauthorized }) {
  const [disciplines, setDisciplines] = useState([]);
  const [topicsByDiscipline, setTopicsByDiscipline] = useState({});
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);

  const [selectedDisciplineId, setSelectedDisciplineId] = useState('');
  const [examName, setExamName] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [drawRules, setDrawRules] = useState([]);
  const [drawResultByTopic, setDrawResultByTopic] = useState([]);
  const [hasDrawRun, setHasDrawRun] = useState(false);
  const [questionSelectionMode, setQuestionSelectionMode] = useState(
    QUESTION_SELECTION_MODE.MANUAL,
  );

  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAlternatives, setShuffleAlternatives] = useState(true);
  const [versionsCount, setVersionsCount] = useState(1);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [message, setMessage] = useState('');
  const [collapsedDisciplines, setCollapsedDisciplines] = useState({});
  const [collapsedTopics, setCollapsedTopics] = useState({});

  const topicById = useMemo(() => {
    const result = {};
    Object.values(topicsByDiscipline)
      .flat()
      .forEach((topic) => {
        result[topic.id] = topic;
      });
    return result;
  }, [topicsByDiscipline]);

  const disciplineById = useMemo(() => {
    const result = {};
    disciplines.forEach((discipline) => {
      result[discipline.id] = discipline;
    });
    return result;
  }, [disciplines]);

  const topicsFromSelectedDiscipline =
    selectedDisciplineId ? topicsByDiscipline[selectedDisciplineId] ?? [] : [];

  const filteredQuestions = useMemo(() => {
    if (!selectedDisciplineId) {
      return questions;
    }

    return questions.filter((question) => {
      const topic = topicById[question.topicId];
      return topic?.disciplineId === selectedDisciplineId;
    });
  }, [questions, selectedDisciplineId, topicById]);

  const questionsCountByTopic = useMemo(() => {
    const result = {};

    filteredQuestions.forEach((question) => {
      result[question.topicId] = (result[question.topicId] ?? 0) + 1;
    });

    return result;
  }, [filteredQuestions]);

  const selectedQuestions = useMemo(
    () =>
      questions.filter((question) =>
        selectedQuestionIds.includes(question.id),
      ),
    [questions, selectedQuestionIds],
  );

  const groupedQuestions = useMemo(() => {
    const questionsByTopicId = new Map();

    filteredQuestions.forEach((question) => {
      const current = questionsByTopicId.get(question.topicId) ?? [];
      current.push(question);
      questionsByTopicId.set(question.topicId, current);
    });

    const visibleDisciplines = selectedDisciplineId
      ? disciplines.filter((discipline) => discipline.id === selectedDisciplineId)
      : disciplines;

    return visibleDisciplines
      .map((discipline) => {
        const topicGroups = (topicsByDiscipline[discipline.id] ?? [])
          .map((topic) => ({
            topic,
            questions: questionsByTopicId.get(topic.id) ?? [],
          }))
          .filter((group) => group.questions.length > 0);

        const questionsCount = topicGroups.reduce(
          (total, group) => total + group.questions.length,
          0,
        );

        return {
          discipline,
          topics: topicGroups,
          questionsCount,
        };
      })
      .filter((group) => group.topics.length > 0);
  }, [disciplines, filteredQuestions, selectedDisciplineId, topicsByDiscipline]);

  const questionById = useMemo(() => {
    const result = {};
    questions.forEach((question) => {
      result[question.id] = question;
    });
    return result;
  }, [questions]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      const [disciplinesData, questionsData, examsData] = await Promise.all([
        apiRequest('/disciplines', { token }),
        apiRequest('/questions', { token }),
        apiRequest('/exams', { token }),
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
      setQuestions(questionsData);
      setExams(examsData);
      setTopicsByDiscipline(Object.fromEntries(topicsPairs));
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao carregar provas');
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (disciplines.length === 0) {
      setSelectedDisciplineId('');
      return;
    }

    if (
      selectedDisciplineId &&
      !disciplines.some((discipline) => discipline.id === selectedDisciplineId)
    ) {
      setSelectedDisciplineId('');
    }
  }, [disciplines, selectedDisciplineId]);

  useEffect(() => {
    const validIds = new Set(questions.map((question) => question.id));
    setSelectedQuestionIds((currentIds) =>
      currentIds.filter((questionId) => validIds.has(questionId)),
    );
  }, [questions]);

  useEffect(() => {
    if (questionSelectionMode !== QUESTION_SELECTION_MODE.DRAW) {
      return;
    }

    if (topicsFromSelectedDiscipline.length === 0) {
      setDrawRules([]);
      return;
    }

    const availableTopicIds = new Set(
      topicsFromSelectedDiscipline.map((topic) => topic.id),
    );

    setDrawRules((currentRules) => {
      const normalizedRules = currentRules.map((rule) => ({
        ...rule,
        topicId: availableTopicIds.has(rule.topicId)
          ? rule.topicId
          : topicsFromSelectedDiscipline[0].id,
      }));

      if (normalizedRules.length === 0) {
        return [createDrawRule(topicsFromSelectedDiscipline[0].id)];
      }

      return normalizedRules;
    });
  }, [questionSelectionMode, topicsFromSelectedDiscipline]);

  function resetDrawSelection() {
    setSelectedQuestionIds([]);
    setDrawResultByTopic([]);
  }

  function handleSelectDiscipline(nextDisciplineId) {
    if (!nextDisciplineId && questionSelectionMode === QUESTION_SELECTION_MODE.DRAW) {
      setQuestionSelectionMode(QUESTION_SELECTION_MODE.MANUAL);
    }

    setSelectedDisciplineId(nextDisciplineId);
    setDrawRules([]);
    setDrawResultByTopic([]);
    setHasDrawRun(false);
  }

  function handleSelectionModeChange(nextMode) {
    setQuestionSelectionMode(nextMode);
    setSelectedQuestionIds([]);
    setDrawResultByTopic([]);
    setHasDrawRun(false);

    if (
      nextMode === QUESTION_SELECTION_MODE.DRAW &&
      topicsFromSelectedDiscipline.length > 0
    ) {
      setDrawRules((currentRules) =>
        currentRules.length > 0
          ? currentRules
          : [createDrawRule(topicsFromSelectedDiscipline[0].id)],
      );
    }
  }

  function toggleQuestion(questionId) {
    setSelectedQuestionIds((currentIds) => {
      if (currentIds.includes(questionId)) {
        return currentIds.filter((id) => id !== questionId);
      }

      return [...currentIds, questionId];
    });
  }

  function addDrawRule() {
    if (topicsFromSelectedDiscipline.length === 0) {
      return;
    }

    setDrawRules((currentRules) => [
      ...currentRules,
      createDrawRule(topicsFromSelectedDiscipline[0].id),
    ]);
    resetDrawSelection();
  }

  function removeDrawRule(ruleId) {
    setDrawRules((currentRules) =>
      currentRules.filter((rule) => rule.id !== ruleId),
    );
    resetDrawSelection();
  }

  function updateDrawRule(ruleId, changes) {
    setDrawRules((currentRules) =>
      currentRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...changes } : rule,
      ),
    );
    resetDrawSelection();
  }

  async function handleDrawQuestions() {
    if (!selectedDisciplineId) {
      setMessage(
        'Para sortear por tópico, selecione uma disciplina específica.',
      );
      return;
    }

    const topicRules = drawRules
      .map((rule) => ({
        topicId: rule.topicId,
        quantity: Number(rule.quantity) || 0,
      }))
      .filter((rule) => rule.topicId && rule.quantity > 0);

    if (topicRules.length === 0) {
      setMessage('Adicione ao menos um tópico com quantidade para sortear');
      return;
    }

    setDrawing(true);
    setMessage('');

    try {
      const drawResult = await apiRequest('/exams/draw-questions', {
        method: 'POST',
        token,
        body: {
          disciplineId: selectedDisciplineId,
          topicRules,
        },
      });

      setSelectedQuestionIds(drawResult.questionIds ?? []);
      setDrawResultByTopic(drawResult.topicSelections ?? []);
      setHasDrawRun(true);
      setMessage('Questões sorteadas com sucesso');
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao sortear questões');
    } finally {
      setDrawing(false);
    }
  }

  async function handleCreateExam(event) {
    event.preventDefault();
    if (!examName.trim() || selectedQuestionIds.length === 0) {
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const createdExam = await apiRequest('/exams', {
        method: 'POST',
        token,
        body: {
          name: examName.trim(),
          description: examDescription.trim() || undefined,
          questionIds: selectedQuestionIds,
          shuffleQuestions,
          shuffleAlternatives,
          versionsCount,
        },
      });
      navigate(`/versions?examId=${createdExam.id}`);
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao criar prova');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExam(examId) {
    const confirmed = window.confirm('Deseja remover esta prova?');
    if (!confirmed) {
      return;
    }

    setMessage('');

    try {
      await apiRequest(`/exams/${examId}`, {
        method: 'DELETE',
        token,
      });
      setMessage('Prova removida');
      await loadData();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(error.message ?? 'Erro ao remover prova');
    }
  }

  function handleOpenExamVersions(examId) {
    navigate(`/versions?examId=${examId}`);
  }

  function toggleDisciplineCollapse(disciplineId) {
    setCollapsedDisciplines((current) => ({
      ...current,
      [disciplineId]: !current[disciplineId],
    }));
  }

  function toggleTopicCollapse(topicKey) {
    setCollapsedTopics((current) => ({
      ...current,
      [topicKey]: !current[topicKey],
    }));
  }

  function handleExamRowClick(event, examId) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('button, a, input, select, textarea')) {
      return;
    }

    handleOpenExamVersions(examId);
  }

  function handleExamRowKeyDown(event, examId) {
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
    handleOpenExamVersions(examId);
  }

  return (
    <div className="page-grid">
      <header>
        <h1>Provas</h1>
        <p className="muted">
          Crie provas, sorteie questões por tópico e defina a geração de
          versões.
        </p>
      </header>

      <section className="card">
        <h2>Nova prova</h2>
        <form onSubmit={handleCreateExam} className="form-grid">
          <label htmlFor="exam-name">Nome da prova</label>
          <input
            id="exam-name"
            type="text"
            value={examName}
            onChange={(event) => setExamName(event.target.value)}
            required
          />

          <label htmlFor="exam-description">Descrição (opcional)</label>
          <textarea
            id="exam-description"
            rows={3}
            value={examDescription}
            onChange={(event) => setExamDescription(event.target.value)}
          />

          <label htmlFor="exam-discipline">Disciplina (opcional)</label>
          <select
            id="exam-discipline"
            value={selectedDisciplineId}
            onChange={(event) => handleSelectDiscipline(event.target.value)}
            disabled={disciplines.length === 0}
          >
            {disciplines.length === 0 ? (
              <option value="">Cadastre uma disciplina</option>
            ) : (
              <>
                <option value="">Todas as disciplinas</option>
                {disciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </>
            )}
          </select>

          <fieldset>
            <legend>Modo de seleção de questões</legend>
            <div className="mode-selector">
              <button
                type="button"
                className={
                  questionSelectionMode === QUESTION_SELECTION_MODE.MANUAL
                    ? 'mode-btn mode-btn-active'
                    : 'mode-btn'
                }
                onClick={() =>
                  handleSelectionModeChange(QUESTION_SELECTION_MODE.MANUAL)
                }
              >
                Selecionar questões
              </button>
              <button
                type="button"
                className={
                  questionSelectionMode === QUESTION_SELECTION_MODE.DRAW
                    ? 'mode-btn mode-btn-active'
                    : 'mode-btn'
                }
                onClick={() =>
                  handleSelectionModeChange(QUESTION_SELECTION_MODE.DRAW)
                }
              >
                Sortear questões
              </button>
            </div>
          </fieldset>

          {questionSelectionMode === QUESTION_SELECTION_MODE.DRAW ? (
            <fieldset>
              <legend>Sorteio por tópico</legend>

              {!selectedDisciplineId ? (
                <p>Selecione uma disciplina específica para usar o sorteio.</p>
              ) : topicsFromSelectedDiscipline.length === 0 ? (
                <p>Não há tópicos para essa disciplina.</p>
              ) : (
                <div className="list-grid">
                  {drawRules.map((rule) => {
                    const availableCount = questionsCountByTopic[rule.topicId] ?? 0;

                    return (
                      <div key={rule.id} className="draw-row">
                        <label className="form-grid">
                          <span>Tópico</span>
                          <select
                            value={rule.topicId}
                            onChange={(event) =>
                              updateDrawRule(rule.id, {
                                topicId: event.target.value,
                              })
                            }
                          >
                            {topicsFromSelectedDiscipline.map((topic) => (
                              <option key={topic.id} value={topic.id}>
                                {topic.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="form-grid">
                          <span>Quantidade</span>
                          <input
                            type="number"
                            min={1}
                            max={availableCount || 1}
                            value={rule.quantity}
                            onChange={(event) =>
                              updateDrawRule(rule.id, {
                                quantity: Math.max(
                                  0,
                                  Math.floor(Number(event.target.value) || 0),
                                ),
                              })
                            }
                          />
                        </label>

                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => removeDrawRule(rule.id)}
                          disabled={drawRules.length <= 1}
                        >
                          Remover
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="inline-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={addDrawRule}
                  disabled={
                    !selectedDisciplineId ||
                    topicsFromSelectedDiscipline.length === 0
                  }
                >
                  + Adicionar tópico
                </button>
                <button
                  type="button"
                  onClick={handleDrawQuestions}
                  disabled={
                    drawing ||
                    !selectedDisciplineId ||
                    topicsFromSelectedDiscipline.length === 0
                  }
                >
                  {drawing ? 'Sorteando...' : 'Sortear questões'}
                </button>
                {hasDrawRun ? (
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={handleDrawQuestions}
                    disabled={
                      drawing ||
                      !selectedDisciplineId ||
                      topicsFromSelectedDiscipline.length === 0
                    }
                  >
                    Sortear novamente
                  </button>
                ) : null}
              </div>
            </fieldset>
          ) : null}

          {questionSelectionMode === QUESTION_SELECTION_MODE.MANUAL ? (
            <fieldset>
              <legend>Selecionar questões</legend>
              {groupedQuestions.length === 0 ? (
                <p>Não há questões para a seleção atual.</p>
              ) : (
                <div className="question-tree">
                  {groupedQuestions.map((disciplineGroup) => {
                    const disciplineId = disciplineGroup.discipline.id;
                    const isDisciplineCollapsed =
                      collapsedDisciplines[disciplineId] ?? false;

                    return (
                      <div key={disciplineId} className="question-group">
                        <button
                          type="button"
                          className="collapse-toggle"
                          onClick={() => toggleDisciplineCollapse(disciplineId)}
                        >
                          <span className="collapse-arrow">
                            {isDisciplineCollapsed ? '>' : 'v'}
                          </span>
                          {disciplineGroup.discipline.name} (
                          {disciplineGroup.questionsCount})
                        </button>

                        {!isDisciplineCollapsed ? (
                          <div className="question-topic-list">
                            {disciplineGroup.topics.map((topicGroup) => {
                              const topicKey = `${disciplineId}:${topicGroup.topic.id}`;
                              const isTopicCollapsed =
                                collapsedTopics[topicKey] ?? false;

                              return (
                                <div key={topicGroup.topic.id} className="question-topic">
                                  <button
                                    type="button"
                                    className="collapse-toggle collapse-toggle-topic"
                                    onClick={() => toggleTopicCollapse(topicKey)}
                                  >
                                    <span className="collapse-arrow">
                                      {isTopicCollapsed ? '>' : 'v'}
                                    </span>
                                    {topicGroup.topic.name} (
                                    {topicGroup.questions.length})
                                  </button>

                                  {!isTopicCollapsed ? (
                                    <div className="checklist checklist-nested">
                                      {topicGroup.questions.map((question) => (
                                        <label
                                          key={question.id}
                                          className="checkbox-label"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedQuestionIds.includes(
                                              question.id,
                                            )}
                                            onChange={() =>
                                              toggleQuestion(question.id)
                                            }
                                          />
                                          {question.text}
                                        </label>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </fieldset>
          ) : null}

          {questionSelectionMode === QUESTION_SELECTION_MODE.DRAW &&
          drawResultByTopic.length > 0 ? (
            <fieldset>
              <legend>Resultado do sorteio</legend>
              <table className="table">
                <thead>
                  <tr>
                    <th>Tópico</th>
                    <th>Questões sorteadas</th>
                  </tr>
                </thead>
                <tbody>
                  {drawResultByTopic.map((selection) => (
                    <tr key={selection.topicId}>
                      <td>{topicById[selection.topicId]?.name ?? selection.topicId}</td>
                      <td>
                        <ul className="compact-list">
                          {selection.questionIds.map((questionId) => (
                            <li key={questionId}>
                              {questionById[questionId]?.text ?? questionId}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </fieldset>
          ) : null}

          <label className="checkbox-label" htmlFor="shuffle-questions">
            <input
              id="shuffle-questions"
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(event) => setShuffleQuestions(event.target.checked)}
            />
            Embaralhar questões
          </label>

          <label className="checkbox-label" htmlFor="shuffle-alternatives">
            <input
              id="shuffle-alternatives"
              type="checkbox"
              checked={shuffleAlternatives}
              onChange={(event) => setShuffleAlternatives(event.target.checked)}
            />
            Embaralhar alternativas
          </label>

          <label htmlFor="versions-count">Quantidade de versões</label>
          <input
            id="versions-count"
            type="number"
            min={1}
            max={26}
            value={versionsCount}
            onChange={(event) => setVersionsCount(Number(event.target.value) || 1)}
          />

          <p>Questões selecionadas: {selectedQuestions.length}</p>

          <button
            type="submit"
            disabled={saving || selectedQuestionIds.length === 0}
          >
            {saving ? 'Salvando...' : 'Criar prova e gerar versões'}
          </button>
        </form>
      </section>

      {message ? <p className="feedback">{message}</p> : null}

      <section className="card">
        <h2>Lista de provas</h2>
        {loading ? <p>Carregando...</p> : null}

        {!loading && exams.length === 0 ? <p>Nenhuma prova cadastrada.</p> : null}

        {!loading && exams.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Disciplina</th>
                <th>Configs</th>
                <th>Criada em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr
                  key={exam.id}
                  className="table-row-clickable"
                  tabIndex={0}
                  onClick={(event) => handleExamRowClick(event, exam.id)}
                  onKeyDown={(event) => handleExamRowKeyDown(event, exam.id)}
                >
                  <td>{exam.name}</td>
                  <td>{disciplineById[exam.disciplineId]?.name ?? '-'}</td>
                  <td>
                    Q:{exam.shuffleQuestions ? 'ON' : 'OFF'} | A:
                    {exam.shuffleAlternatives ? 'ON' : 'OFF'} | N:
                    {exam.versionsCountDefault}
                  </td>
                  <td>{new Date(exam.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleDeleteExam(exam.id)}
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
