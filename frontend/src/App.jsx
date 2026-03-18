import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('access_token') ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingCreateDiscipline, setLoadingCreateDiscipline] = useState(false);
  const [loadingCreateTopic, setLoadingCreateTopic] = useState(false);
  const [loadingCreateQuestion, setLoadingCreateQuestion] = useState(false);
  const [loadingCreateAlternative, setLoadingCreateAlternative] = useState(false);
  const [loadingCreateExam, setLoadingCreateExam] = useState(false);
  const [message, setMessage] = useState('');
  const [disciplines, setDisciplines] = useState([]);
  const [topicsByDiscipline, setTopicsByDiscipline] = useState({});
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [disciplineName, setDisciplineName] = useState('');
  const [topicDisciplineId, setTopicDisciplineId] = useState('');
  const [topicName, setTopicName] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('MULTIPLE_CHOICE');
  const [questionTopicId, setQuestionTopicId] = useState('');
  const [alternativeQuestionId, setAlternativeQuestionId] = useState('');
  const [alternativeText, setAlternativeText] = useState('');
  const [alternativeType, setAlternativeType] = useState('TEXT');
  const [alternativeIsCorrect, setAlternativeIsCorrect] = useState(false);
  const [examName, setExamName] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [examQuestionIds, setExamQuestionIds] = useState([]);

  const allTopics = useMemo(
    () => Object.values(topicsByDiscipline).flat(),
    [topicsByDiscipline],
  );

  const topicById = useMemo(() => {
    return allTopics.reduce((accumulator, topic) => {
      accumulator[topic.id] = topic;
      return accumulator;
    }, {});
  }, [allTopics]);

  async function parseJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function fetchWithAuth(path, currentToken) {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    const data = await parseJson(response);
    if (!response.ok) {
      const backendMessage = Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message;
      const error = new Error(
        backendMessage ?? `Falha ao carregar ${path} (${response.status})`,
      );
      error.status = response.status;
      throw error;
    }

    return data ?? [];
  }

  async function postWithAuth(path, currentToken, body) {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await parseJson(response);
    if (!response.ok) {
      const backendMessage = Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message;
      const error = new Error(
        backendMessage ?? `Falha ao enviar ${path} (${response.status})`,
      );
      error.status = response.status;
      throw error;
    }

    return data;
  }

  async function loadOverview(currentToken) {
    setLoadingOverview(true);
    setMessage('');

    try {
      const [disciplinesData, questionsData, examsData] = await Promise.all([
        fetchWithAuth('/disciplines', currentToken),
        fetchWithAuth('/questions', currentToken),
        fetchWithAuth('/exams', currentToken),
      ]);

      const topicsPairs = await Promise.all(
        disciplinesData.map(async (discipline) => {
          const topics = await fetchWithAuth(
            `/disciplines/${discipline.id}/topics`,
            currentToken,
          );
          return [discipline.id, topics];
        }),
      );

      setDisciplines(disciplinesData);
      setQuestions(questionsData);
      setExams(examsData);
      setTopicsByDiscipline(Object.fromEntries(topicsPairs));
    } catch (error) {
      if (error.status === 401) {
        handleLogout();
        setMessage('Sessao expirada, faca login novamente');
      } else {
        setMessage(error.message ?? 'Erro ao carregar dados');
      }
    } finally {
      setLoadingOverview(false);
    }
  }

  function renderAlternatives(question) {
    const alternatives = question.alternatives ?? [];

    if (alternatives.length === 0) {
      return <p>Sem alternativas cadastradas</p>;
    }

    return (
      <ul>
        {alternatives.map((alternative, index) => (
          <li key={alternative.id}>
            {String.fromCharCode(65 + index)}. {alternative.text}{' '}
            {alternative.isCorrect ? '(correta)' : ''}
          </li>
        ))}
      </ul>
    );
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    setToken('');
    setDisciplines([]);
    setTopicsByDiscipline({});
    setQuestions([]);
    setExams([]);
    setDisciplineName('');
    setTopicDisciplineId('');
    setTopicName('');
    setQuestionText('');
    setQuestionType('MULTIPLE_CHOICE');
    setQuestionTopicId('');
    setAlternativeQuestionId('');
    setAlternativeText('');
    setAlternativeType('TEXT');
    setAlternativeIsCorrect(false);
    setExamName('');
    setExamDescription('');
    setExamQuestionIds([]);
  }

  function handleToggleExamQuestion(questionId) {
    setExamQuestionIds((currentQuestionIds) => {
      if (currentQuestionIds.includes(questionId)) {
        return currentQuestionIds.filter((id) => id !== questionId);
      }

      return [...currentQuestionIds, questionId];
    });
  }

  async function handleCreateDiscipline(event) {
    event.preventDefault();
    if (!disciplineName.trim()) {
      return;
    }

    setLoadingCreateDiscipline(true);
    setMessage('');

    try {
      await postWithAuth('/disciplines', token, { name: disciplineName.trim() });
      setDisciplineName('');
      setMessage('Disciplina criada com sucesso');
      await loadOverview(token);
    } catch (error) {
      setMessage(error.message ?? 'Erro ao criar disciplina');
    } finally {
      setLoadingCreateDiscipline(false);
    }
  }

  async function handleCreateTopic(event) {
    event.preventDefault();
    if (!topicName.trim() || !topicDisciplineId) {
      return;
    }

    setLoadingCreateTopic(true);
    setMessage('');

    try {
      await postWithAuth(`/disciplines/${topicDisciplineId}/topics`, token, {
        name: topicName.trim(),
      });
      setTopicName('');
      setMessage('Topico criado com sucesso');
      await loadOverview(token);
    } catch (error) {
      setMessage(error.message ?? 'Erro ao criar topico');
    } finally {
      setLoadingCreateTopic(false);
    }
  }

  async function handleCreateQuestion(event) {
    event.preventDefault();
    if (!questionText.trim() || !questionTopicId) {
      return;
    }

    setLoadingCreateQuestion(true);
    setMessage('');

    try {
      await postWithAuth('/questions', token, {
        text: questionText.trim(),
        type: questionType,
        topicId: questionTopicId,
      });
      setQuestionText('');
      setMessage('Questao criada com sucesso');
      await loadOverview(token);
    } catch (error) {
      setMessage(error.message ?? 'Erro ao criar questao');
    } finally {
      setLoadingCreateQuestion(false);
    }
  }

  async function handleCreateAlternative(event) {
    event.preventDefault();
    if (!alternativeQuestionId || !alternativeText.trim()) {
      return;
    }

    setLoadingCreateAlternative(true);
    setMessage('');

    try {
      await postWithAuth('/alternatives', token, {
        questionId: alternativeQuestionId,
        text: alternativeText.trim(),
        type: alternativeType,
        isCorrect: alternativeIsCorrect,
      });
      setAlternativeText('');
      setAlternativeType('TEXT');
      setAlternativeIsCorrect(false);
      setMessage('Alternativa criada com sucesso');
      await loadOverview(token);
    } catch (error) {
      setMessage(error.message ?? 'Erro ao criar alternativa');
    } finally {
      setLoadingCreateAlternative(false);
    }
  }

  async function handleCreateExam(event) {
    event.preventDefault();
    if (!examName.trim() || examQuestionIds.length === 0) {
      return;
    }

    setLoadingCreateExam(true);
    setMessage('');

    try {
      await postWithAuth('/exams', token, {
        name: examName.trim(),
        description: examDescription.trim() || undefined,
        questionIds: examQuestionIds,
      });
      setExamName('');
      setExamDescription('');
      setExamQuestionIds([]);
      setMessage('Prova criada com sucesso');
      await loadOverview(token);
    } catch (error) {
      setMessage(error.message ?? 'Erro ao criar prova');
    } finally {
      setLoadingCreateExam(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoadingLogin(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? 'Falha no login');
      }

      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        setToken(data.access_token);
      }

      setMessage('Login realizado com sucesso');
    } catch (error) {
      setMessage(error.message ?? 'Erro inesperado');
    } finally {
      setLoadingLogin(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    loadOverview(token);
  }, [token]);

  useEffect(() => {
    if (disciplines.length === 0) {
      setTopicDisciplineId('');
      return;
    }

    const disciplineExists = disciplines.some(
      (discipline) => discipline.id === topicDisciplineId,
    );
    if (!disciplineExists) {
      setTopicDisciplineId(disciplines[0].id);
    }
  }, [disciplines, topicDisciplineId]);

  useEffect(() => {
    if (allTopics.length === 0) {
      setQuestionTopicId('');
      return;
    }

    const topicExists = allTopics.some((topic) => topic.id === questionTopicId);
    if (!topicExists) {
      setQuestionTopicId(allTopics[0].id);
    }
  }, [allTopics, questionTopicId]);

  useEffect(() => {
    if (questions.length === 0) {
      setAlternativeQuestionId('');
      return;
    }

    const questionExists = questions.some(
      (question) => question.id === alternativeQuestionId,
    );
    if (!questionExists) {
      setAlternativeQuestionId(questions[0].id);
    }
  }, [questions, alternativeQuestionId]);

  useEffect(() => {
    if (examQuestionIds.length === 0) {
      return;
    }

    const validQuestionIds = new Set(questions.map((question) => question.id));
    setExamQuestionIds((currentQuestionIds) =>
      currentQuestionIds.filter((questionId) => validQuestionIds.has(questionId)),
    );
  }, [questions, examQuestionIds.length]);

  if (token) {
    return (
      <main>
        <h1>Visao Basica</h1>

        <button type="button" onClick={() => loadOverview(token)} disabled={loadingOverview}>
          {loadingOverview ? 'Atualizando...' : 'Atualizar'}
        </button>
        <button type="button" onClick={handleLogout}>
          Sair
        </button>

        {message ? <p>{message}</p> : null}

        <section>
          <h2>Criar Disciplina</h2>
          <form onSubmit={handleCreateDiscipline}>
            <label htmlFor="disciplineName">Nome da disciplina</label>
            <input
              id="disciplineName"
              type="text"
              value={disciplineName}
              onChange={(event) => setDisciplineName(event.target.value)}
              required
            />
            <button type="submit" disabled={loadingCreateDiscipline}>
              {loadingCreateDiscipline ? 'Criando...' : 'Criar disciplina'}
            </button>
          </form>
        </section>

        <section>
          <h2>Criar Topico</h2>
          <form onSubmit={handleCreateTopic}>
            <label htmlFor="topicDiscipline">Disciplina</label>
            <select
              id="topicDiscipline"
              value={topicDisciplineId}
              onChange={(event) => setTopicDisciplineId(event.target.value)}
              disabled={disciplines.length === 0}
              required
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

            <label htmlFor="topicName">Nome do topico</label>
            <input
              id="topicName"
              type="text"
              value={topicName}
              onChange={(event) => setTopicName(event.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loadingCreateTopic || disciplines.length === 0}
            >
              {loadingCreateTopic ? 'Criando...' : 'Criar topico'}
            </button>
          </form>
        </section>

        <section>
          <h2>Criar Questao</h2>
          <form onSubmit={handleCreateQuestion}>
            <label htmlFor="questionTopic">Topico</label>
            <select
              id="questionTopic"
              value={questionTopicId}
              onChange={(event) => setQuestionTopicId(event.target.value)}
              disabled={allTopics.length === 0}
              required
            >
              {allTopics.length === 0 ? (
                <option value="">Cadastre um topico primeiro</option>
              ) : (
                allTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))
              )}
            </select>

            <label htmlFor="questionType">Tipo</label>
            <select
              id="questionType"
              value={questionType}
              onChange={(event) => setQuestionType(event.target.value)}
              required
            >
              <option value="MULTIPLE_CHOICE">MULTIPLE_CHOICE</option>
              <option value="TRUE_FALSE">TRUE_FALSE</option>
            </select>

            <label htmlFor="questionText">Texto da questao</label>
            <textarea
              id="questionText"
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
              rows={4}
              required
            />

            <button
              type="submit"
              disabled={loadingCreateQuestion || allTopics.length === 0}
            >
              {loadingCreateQuestion ? 'Criando...' : 'Criar questao'}
            </button>
          </form>
        </section>

        <section>
          <h2>Criar Alternativa</h2>
          <form onSubmit={handleCreateAlternative}>
            <label htmlFor="alternativeQuestion">Questao</label>
            <select
              id="alternativeQuestion"
              value={alternativeQuestionId}
              onChange={(event) => setAlternativeQuestionId(event.target.value)}
              disabled={questions.length === 0}
              required
            >
              {questions.length === 0 ? (
                <option value="">Cadastre uma questao primeiro</option>
              ) : (
                questions.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.text}
                  </option>
                ))
              )}
            </select>

            <label htmlFor="alternativeType">Tipo da alternativa</label>
            <select
              id="alternativeType"
              value={alternativeType}
              onChange={(event) => setAlternativeType(event.target.value)}
              required
            >
              <option value="TEXT">TEXT</option>
              <option value="IMAGE">IMAGE</option>
            </select>

            <label htmlFor="alternativeText">Texto da alternativa</label>
            <input
              id="alternativeText"
              type="text"
              value={alternativeText}
              onChange={(event) => setAlternativeText(event.target.value)}
              required
            />

            <label htmlFor="alternativeCorrect">
              <input
                id="alternativeCorrect"
                type="checkbox"
                checked={alternativeIsCorrect}
                onChange={(event) => setAlternativeIsCorrect(event.target.checked)}
              />
              Alternativa correta
            </label>

            <button
              type="submit"
              disabled={loadingCreateAlternative || questions.length === 0}
            >
              {loadingCreateAlternative ? 'Criando...' : 'Criar alternativa'}
            </button>
          </form>
        </section>

        <section>
          <h2>Criar Prova</h2>
          <form onSubmit={handleCreateExam}>
            <label htmlFor="examName">Nome da prova</label>
            <input
              id="examName"
              type="text"
              value={examName}
              onChange={(event) => setExamName(event.target.value)}
              required
            />

            <label htmlFor="examDescription">Descricao (opcional)</label>
            <textarea
              id="examDescription"
              value={examDescription}
              onChange={(event) => setExamDescription(event.target.value)}
              rows={3}
            />

            <p>Selecione as questoes da prova</p>
            {questions.length === 0 ? (
              <p>Cadastre uma questao primeiro</p>
            ) : (
              <ul>
                {questions.map((question) => {
                  const topic = topicById[question.topicId];
                  const discipline = disciplines.find(
                    (disciplineItem) => disciplineItem.id === topic?.disciplineId,
                  );

                  return (
                    <li key={question.id}>
                      <label htmlFor={`exam-question-${question.id}`}>
                        <input
                          id={`exam-question-${question.id}`}
                          type="checkbox"
                          checked={examQuestionIds.includes(question.id)}
                          onChange={() => handleToggleExamQuestion(question.id)}
                        />
                        {question.text} | Topico: {topic?.name ?? '-'} | Disciplina:{' '}
                        {discipline?.name ?? '-'}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            <p>Questoes selecionadas: {examQuestionIds.length}</p>
            <button
              type="submit"
              disabled={
                loadingCreateExam ||
                questions.length === 0 ||
                examQuestionIds.length === 0
              }
            >
              {loadingCreateExam ? 'Criando...' : 'Criar prova'}
            </button>
          </form>
        </section>

        <p>Total de disciplinas: {disciplines.length}</p>
        <p>Total de topicos: {allTopics.length}</p>
        <p>Total de questoes: {questions.length}</p>
        <p>Total de provas: {exams.length}</p>

        {disciplines.map((discipline) => {
          const disciplineTopics = topicsByDiscipline[discipline.id] ?? [];
          const disciplineExams = exams.filter(
            (exam) => exam.disciplineId === discipline.id,
          );

          return (
            <section key={discipline.id}>
              <h2>{discipline.name}</h2>

              <h3>Topicos</h3>
              {disciplineTopics.length === 0 ? (
                <p>Nenhum topico cadastrado</p>
              ) : (
                <ul>
                  {disciplineTopics.map((topic) => {
                    const topicQuestions = questions.filter(
                      (question) => question.topicId === topic.id,
                    );

                    return (
                      <li key={topic.id}>
                        {topic.name} ({topicQuestions.length} questoes)
                        {topicQuestions.length > 0 ? (
                          <ul>
                            {topicQuestions.map((question) => (
                              <li key={question.id}>
                                {question.text}
                                {renderAlternatives(question)}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              <h3>Provas</h3>
              {disciplineExams.length === 0 ? (
                <p>Nenhuma prova cadastrada</p>
              ) : (
                <ul>
                  {disciplineExams.map((exam) => (
                    <li key={exam.id}>{exam.name}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <h2>Todas as Questoes</h2>
        {questions.length === 0 ? (
          <p>Nenhuma questao cadastrada</p>
        ) : (
          <ul>
            {questions.map((question) => {
              const topic = topicById[question.topicId];
              const discipline = disciplines.find(
                (disciplineItem) => disciplineItem.id === topic?.disciplineId,
              );

              return (
                <li key={question.id}>
                  {question.text} | Topico: {topic?.name ?? '-'} | Disciplina:{' '}
                  {discipline?.name ?? '-'}
                  {renderAlternatives(question)}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    );
  }

  return (
    <main>
      <h1>Login</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button type="submit" disabled={loadingLogin}>
          {loadingLogin ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      {message ? <p>{message}</p> : null}
    </main>
  );
}
