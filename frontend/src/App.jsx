import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('access_token') ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [message, setMessage] = useState('');
  const [disciplines, setDisciplines] = useState([]);
  const [topicsByDiscipline, setTopicsByDiscipline] = useState({});
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);

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
