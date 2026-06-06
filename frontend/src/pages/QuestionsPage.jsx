import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../components/ToastProvider';
import { API_URL, apiRequest, apiUploadFile } from '../lib/api';
import { appConfig } from '../lib/app-config';

const DEFAULT_DISSERTATIVE_ANSWER_SPACE_SIZE =
  appConfig.defaults.dissertativeAnswerSpaceSize;

function optionLetter(index) {
  return String.fromCharCode(65 + index);
}

function createDraftId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatQuestionType(type) {
  if (type === 'DISSERTATIVE') {
    return 'Dissertativa';
  }

  if (type === 'MULTIPLE_CHOICE') {
    return 'Múltipla escolha';
  }

  return type;
}

function formatAnswerSpaceSize(size) {
  if (size === 'SMALL') {
    return 'Pequeno';
  }

  if (size === 'MEDIUM') {
    return 'Médio';
  }

  if (size === 'LARGE') {
    return 'Grande';
  }

  return '-';
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function createAlternativeDraft(initial = {}) {
  return {
    draftId: createDraftId('alt'),
    existingId: null,
    text: '',
    type: 'TEXT',
    isCorrect: false,
    imageFile: null,
    existingImageFileId: null,
    ...initial,
  };
}

function createQuestionImageDraft(initial = {}) {
  return {
    draftId: createDraftId('qimg'),
    file: null,
    existingFileId: null,
    ...initial,
  };
}

function AuthenticatedImage({ token, fileId, alt, className }) {
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    let objectUrl = '';
    let isCancelled = false;

    async function loadImage() {
      try {
        const response = await fetch(`${API_URL}/uploaded-files/${fileId}/content`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`Falha ao carregar imagem (${response.status})`);
        }

        const imageBlob = await response.blob();
        objectUrl = URL.createObjectURL(imageBlob);

        if (!isCancelled) {
          setImageSrc(objectUrl);
        }
      } catch {
        if (!isCancelled) {
          setImageSrc('');
        }
      }
    }

    loadImage();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId, token]);

  if (!imageSrc) {
    return <span className="muted">{alt}</span>;
  }

  return <img src={imageSrc} alt={alt} className={className} />;
}

function TrashIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v8h-2V9zm4 0h2v8h-2V9zM7 9h2v8H7V9zm1 12a2 2 0 0 1-2-2V8h12v11a2 2 0 0 1-2 2H8z"
        fill="currentColor"
      />
    </svg>
  );
}

function PencilIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <path
        d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zm15.71-10.04a1 1 0 0 0 0-1.41L18.2 4.29a1 1 0 0 0-1.41 0l-1.03 1.03 2.75 2.75 1.2-.86z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function QuestionsPage({ token, onUnauthorized }) {
  const { notify } = useToast();
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
  const [editingDisciplineId, setEditingDisciplineId] = useState('');
  const [editingTopicId, setEditingTopicId] = useState('');
  const [selectedDisciplineFilterId, setSelectedDisciplineFilterId] = useState('');
  const [disciplineSearchTerm, setDisciplineSearchTerm] = useState('');

  const [questionDisciplineId, setQuestionDisciplineId] = useState('');
  const [questionTopicId, setQuestionTopicId] = useState('');
  const [questionType, setQuestionType] = useState('MULTIPLE_CHOICE');
  const [questionText, setQuestionText] = useState('');
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [questionAnswerText, setQuestionAnswerText] = useState('');
  const [questionAnswerSpaceSize, setQuestionAnswerSpaceSize] = useState(
    DEFAULT_DISSERTATIVE_ANSWER_SPACE_SIZE,
  );
  const [questionImageDrafts, setQuestionImageDrafts] = useState([]);
  const [questionAlternatives, setQuestionAlternatives] = useState([
    createAlternativeDraft(),
    createAlternativeDraft(),
  ]);
  const [editingQuestionId, setEditingQuestionId] = useState('');
  const [initialAlternativeIds, setInitialAlternativeIds] = useState([]);
  const [deletedAlternativeIds, setDeletedAlternativeIds] = useState([]);

  const [loading, setLoading] = useState(false);
  const [savingDiscipline, setSavingDiscipline] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingDisciplineId, setDeletingDisciplineId] = useState('');
  const [deletingTopicId, setDeletingTopicId] = useState('');
  const [deletingQuestionId, setDeletingQuestionId] = useState('');

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
  const isEditingMode = Boolean(editingQuestionId);
  const isEditingDiscipline = Boolean(editingDisciplineId);
  const isEditingTopic = Boolean(editingTopicId);

  const filteredDisciplines = useMemo(() => {
    const normalizedSearch = normalizeSearchText(disciplineSearchTerm);

    if (!normalizedSearch) {
      return disciplines;
    }

    return disciplines.filter((discipline) =>
      normalizeSearchText(discipline.name).includes(normalizedSearch),
    );
  }, [disciplines, disciplineSearchTerm]);

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = normalizeSearchText(questionSearchTerm);

    return questions.filter((question) => {
      const topic = topicById[question.topicId];
      const matchesDiscipline =
        !selectedDisciplineFilterId ||
        topic?.disciplineId === selectedDisciplineFilterId;
      const matchesTitle =
        !normalizedSearch ||
        normalizeSearchText(question.text).includes(normalizedSearch);

      return matchesDiscipline && matchesTitle;
    });
  }, [questions, questionSearchTerm, selectedDisciplineFilterId, topicById]);

  const hasQuestionFilters = Boolean(
    selectedDisciplineFilterId || normalizeSearchText(questionSearchTerm),
  );

  const loadData = useCallback(async () => {
    setLoading(true);

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
      notify(error.message ?? 'Erro ao carregar banco de questões', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized, notify]);

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
    setEditingDisciplineId('');
    setDisciplineName('');
    setCreateTopicWithDiscipline(false);
    setDisciplineInitialTopicName('');
    setShowDisciplineModal(true);
  }

  function openDisciplineModalForEdit(discipline) {
    setEditingDisciplineId(discipline.id);
    setDisciplineName(discipline.name ?? '');
    setCreateTopicWithDiscipline(false);
    setDisciplineInitialTopicName('');
    setShowDisciplineModal(true);
  }

  function openTopicModalForDiscipline(disciplineId) {
    if (!disciplineId) {
      return;
    }

    setEditingTopicId('');
    setTopicName('');
    setTopicDisciplineId(disciplineId);
    setShowTopicModal(true);
  }

  function openTopicModalForEdit(topic) {
    setEditingTopicId(topic.id);
    setTopicName(topic.name ?? '');
    setTopicDisciplineId(topic.disciplineId);
    setShowTopicModal(true);
  }

  function resetQuestionModalState() {
    setEditingQuestionId('');
    setInitialAlternativeIds([]);
    setDeletedAlternativeIds([]);
    setQuestionType('MULTIPLE_CHOICE');
    setQuestionText('');
    setQuestionAnswerText('');
    setQuestionAnswerSpaceSize(DEFAULT_DISSERTATIVE_ANSWER_SPACE_SIZE);
    setQuestionImageDrafts([]);
    setQuestionAlternatives([createAlternativeDraft(), createAlternativeDraft()]);
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

    resetQuestionModalState();
    setQuestionDisciplineId(initialDisciplineId);
    setQuestionTopicId(initialTopicId ?? '');
    setShowQuestionModal(true);
  }

  function openQuestionModalForEdit(question) {
    const topic = topicById[question.topicId];
    const topicDisciplineId = topic?.disciplineId;

    if (!topicDisciplineId) {
      notify('Não foi possível localizar a disciplina da questão', 'error');
      return;
    }

    const alternativesFromQuestion = (question.alternatives ?? []).map(
      (alternative) =>
        createAlternativeDraft({
          existingId: alternative.id,
          text: alternative.text ?? '',
          type: alternative.type,
          isCorrect: alternative.isCorrect,
          existingImageFileId: alternative.imageFileId ?? null,
          imageFile: null,
        }),
    );

    const normalizedAlternatives =
      question.type === 'MULTIPLE_CHOICE'
        ? alternativesFromQuestion.length >= 2
          ? alternativesFromQuestion
          : [
              ...alternativesFromQuestion,
              ...Array.from(
                {
                  length: 2 - alternativesFromQuestion.length,
                },
                () => createAlternativeDraft(),
              ),
            ]
        : [createAlternativeDraft(), createAlternativeDraft()];

    const questionImageDraftsFromQuestion = (question.questionImages ?? []).map(
      (questionImage) =>
        createQuestionImageDraft({
          existingFileId: questionImage.fileId,
          file: null,
        }),
    );

    setEditingQuestionId(question.id);
    setInitialAlternativeIds((question.alternatives ?? []).map((item) => item.id));
    setDeletedAlternativeIds([]);
    setQuestionDisciplineId(topicDisciplineId);
    setQuestionTopicId(question.topicId);
    setQuestionType(question.type);
    setQuestionText(question.text ?? '');
    setQuestionAnswerText(question.answerText ?? '');
    setQuestionAnswerSpaceSize(
      question.answerSpaceSize ?? DEFAULT_DISSERTATIVE_ANSWER_SPACE_SIZE,
    );
    setQuestionImageDrafts(questionImageDraftsFromQuestion);
    setQuestionAlternatives(normalizedAlternatives);
    setShowQuestionModal(true);
  }

  function closeAllModals() {
    setShowDisciplineModal(false);
    setShowTopicModal(false);
    setShowQuestionModal(false);
    setEditingDisciplineId('');
    setEditingTopicId('');
  }

  function handleQuestionDisciplineChange(nextDisciplineId) {
    setQuestionDisciplineId(nextDisciplineId);
    const nextTopics = topicsByDiscipline[nextDisciplineId] ?? [];
    setQuestionTopicId(nextTopics[0]?.id ?? '');
  }

  function handleQuestionTypeChange(nextType) {
    setQuestionType(nextType);

    if (nextType === 'MULTIPLE_CHOICE') {
      setQuestionAnswerText('');
      setQuestionAnswerSpaceSize(DEFAULT_DISSERTATIVE_ANSWER_SPACE_SIZE);
      return;
    }

    setQuestionAlternatives([createAlternativeDraft(), createAlternativeDraft()]);
  }

  function addAlternativeDraft() {
    setQuestionAlternatives((current) => [...current, createAlternativeDraft()]);
  }

  function addQuestionImageDraft() {
    setQuestionImageDrafts((current) => [...current, createQuestionImageDraft()]);
  }

  function removeQuestionImageDraft(imageDraftId) {
    setQuestionImageDrafts((current) =>
      current.filter((imageDraft) => imageDraft.draftId !== imageDraftId),
    );
  }

  function updateQuestionImageDraft(imageDraftId, changes) {
    setQuestionImageDrafts((current) =>
      current.map((imageDraft) =>
        imageDraft.draftId === imageDraftId
          ? { ...imageDraft, ...changes }
          : imageDraft,
      ),
    );
  }

  function removeAlternativeDraft(alternativeDraftId) {
    setQuestionAlternatives((current) => {
      const alternativeToRemove = current.find(
        (alternative) => alternative.draftId === alternativeDraftId,
      );

      if (alternativeToRemove?.existingId) {
        setDeletedAlternativeIds((existingIds) =>
          existingIds.includes(alternativeToRemove.existingId)
            ? existingIds
            : [...existingIds, alternativeToRemove.existingId],
        );
      }

      return current.filter(
        (alternative) => alternative.draftId !== alternativeDraftId,
      );
    });
  }

  function updateAlternativeDraft(alternativeDraftId, changes) {
    setQuestionAlternatives((current) =>
      current.map((alternative) =>
        alternative.draftId === alternativeDraftId
          ? { ...alternative, ...changes }
          : alternative,
      ),
    );
  }

  async function handleSaveDiscipline(event) {
    event.preventDefault();

    if (!disciplineName.trim()) {
      return;
    }

    const isEditing = Boolean(editingDisciplineId);
    const normalizedName = disciplineName.trim();

    setSavingDiscipline(true);

    try {
      if (isEditing) {
        await apiRequest(`/disciplines/${editingDisciplineId}`, {
          method: 'PATCH',
          token,
          body: {
            name: normalizedName,
          },
        });
      } else {
        const createdDiscipline = await apiRequest('/disciplines', {
          method: 'POST',
          token,
          body: {
            name: normalizedName,
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

        setSelectedDisciplineFilterId(createdDiscipline.id);
      }

      closeAllModals();
      notify(
        isEditing
          ? 'Disciplina atualizada com sucesso'
          : createTopicWithDiscipline && disciplineInitialTopicName.trim()
          ? 'Disciplina e tópico criados com sucesso'
          : 'Disciplina criada com sucesso',
        'success',
      );
      await loadData();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      notify(
        error.message ??
          (isEditing ? 'Erro ao atualizar disciplina' : 'Erro ao criar disciplina'),
        'error',
      );
    } finally {
      setSavingDiscipline(false);
    }
  }

  async function handleSaveTopic(event) {
    event.preventDefault();

    if (!topicDisciplineId || !topicName.trim()) {
      return;
    }

    const isEditing = Boolean(editingTopicId);
    const normalizedName = topicName.trim();

    setSavingTopic(true);

    try {
      if (isEditing) {
        await apiRequest(`/topics/${editingTopicId}`, {
          method: 'PATCH',
          token,
          body: {
            name: normalizedName,
          },
        });
      } else {
        await apiRequest(`/disciplines/${topicDisciplineId}/topics`, {
          method: 'POST',
          token,
          body: {
            name: normalizedName,
          },
        });
      }

      closeAllModals();
      notify(
        isEditing ? 'Tópico atualizado com sucesso' : 'Tópico criado com sucesso',
        'success',
      );
      await loadData();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      notify(
        error.message ??
          (isEditing ? 'Erro ao atualizar tópico' : 'Erro ao criar tópico'),
        'error',
      );
    } finally {
      setSavingTopic(false);
    }
  }

  async function handleDeleteDiscipline(discipline) {
    const topicsForDiscipline = topicsByDiscipline[discipline.id] ?? [];
    const relatedQuestionCount = questions.filter((question) => {
      const topic = topicById[question.topicId];
      return topic?.disciplineId === discipline.id;
    }).length;

    const confirmed = window.confirm(
      `Deseja realmente excluir a disciplina "${discipline.name}"? Isso apagará ${topicsForDiscipline.length} tópico(s), ${relatedQuestionCount} questão(ões), alternativas e provas/versões relacionadas. Esta ação não pode ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingDisciplineId(discipline.id);

    try {
      await apiRequest(`/disciplines/${discipline.id}`, {
        method: 'DELETE',
        token,
      });

      if (selectedDisciplineFilterId === discipline.id) {
        setSelectedDisciplineFilterId('');
      }

      closeAllModals();
      notify(
        'Disciplina excluída com tópicos e questões relacionados',
        'success',
      );
      await loadData();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }

      notify(error.message ?? 'Erro ao excluir disciplina', 'error');
    } finally {
      setDeletingDisciplineId('');
    }
  }

  async function handleDeleteTopic(topic) {
    const relatedQuestionCount = questions.filter(
      (question) => question.topicId === topic.id,
    ).length;

    const confirmed = window.confirm(
      `Deseja realmente excluir o tópico "${topic.name}"? Isso apagará ${relatedQuestionCount} questão(ões), alternativas e referências relacionadas. Esta ação não pode ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingTopicId(topic.id);

    try {
      await apiRequest(`/topics/${topic.id}`, {
        method: 'DELETE',
        token,
      });

      closeAllModals();
      notify('Tópico excluído com questões relacionadas', 'success');
      await loadData();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }

      notify(error.message ?? 'Erro ao excluir tópico', 'error');
    } finally {
      setDeletingTopicId('');
    }
  }

  async function handleCreateQuestionWithAlternatives(event) {
    event.preventDefault();

    if (!questionTopicId || !questionText.trim()) {
      return;
    }

    if (isEditingMode) {
      const shouldSaveChanges = window.confirm(
        'Deseja realmente salvar as alterações desta questão?',
      );

      if (!shouldSaveChanges) {
        return;
      }
    }

    const isMultipleChoice = questionType === 'MULTIPLE_CHOICE';
    const normalizedAnswerText = questionAnswerText.trim();

    if (!isMultipleChoice) {
      if (!normalizedAnswerText) {
        notify('Para questão dissertativa, informe a resposta', 'error');
        return;
      }

      if (!questionAnswerSpaceSize) {
        notify(
          'Selecione o tamanho de espaço para a questão dissertativa',
          'error',
        );
        return;
      }
    }

    const alternativesPayload = isMultipleChoice
      ? questionAlternatives
          .map((alternative) => ({
            draftId: alternative.draftId,
            existingId: alternative.existingId,
            type: alternative.type,
            isCorrect: alternative.isCorrect,
            text: alternative.text.trim(),
            imageFile: alternative.imageFile,
            existingImageFileId: alternative.existingImageFileId,
          }))
          .filter((alternative) => {
            if (alternative.type === 'IMAGE') {
              return Boolean(
                alternative.imageFile || alternative.existingImageFileId,
              );
            }

            return alternative.text.length > 0;
          })
      : [];

    if (isMultipleChoice && alternativesPayload.length < 2) {
      notify('Adicione ao menos 2 alternativas com texto ou imagem', 'error');
      return;
    }

    const correctCount = alternativesPayload.filter(
      (alternative) => alternative.isCorrect,
    ).length;

    if (isMultipleChoice && correctCount < 1) {
      notify('Marque ao menos 1 alternativa correta', 'error');
      return;
    }

    const invalidImageAlternative = alternativesPayload.find(
      (alternative) =>
        alternative.type === 'IMAGE' &&
        !alternative.imageFile &&
        !alternative.existingImageFileId,
    );

    if (isMultipleChoice && invalidImageAlternative) {
      notify('Alternativas de imagem precisam de arquivo', 'error');
      return;
    }

    setSavingQuestion(true);

    let savedQuestionId = editingQuestionId;
    const uploadedFileIds = [];

    try {
      const questionImageFileIds = [];

      for (const questionImageDraft of questionImageDrafts) {
        if (questionImageDraft.file) {
          const uploadedFile = await apiUploadFile('/uploaded-files/upload', {
            token,
            file: questionImageDraft.file,
          });

          uploadedFileIds.push(uploadedFile.id);
          questionImageFileIds.push(uploadedFile.id);
          continue;
        }

        if (questionImageDraft.existingFileId) {
          questionImageFileIds.push(questionImageDraft.existingFileId);
        }
      }

      const questionPayload = {
        text: questionText.trim(),
        type: questionType,
        ...(isMultipleChoice
          ? {}
          : {
              answerText: normalizedAnswerText,
              answerSpaceSize: questionAnswerSpaceSize,
            }),
        topicId: questionTopicId,
        questionImageFileIds,
      };

      if (isEditingMode) {
        await apiRequest(`/questions/${editingQuestionId}`, {
          method: 'PATCH',
          token,
          body: questionPayload,
        });
      } else {
        const createdQuestion = await apiRequest('/questions', {
          method: 'POST',
          token,
          body: questionPayload,
        });
        savedQuestionId = createdQuestion.id;
      }

      if (!savedQuestionId) {
        throw new Error('ID da questão é obrigatório após salvar');
      }

      if (isMultipleChoice) {
        const alternativesPayloadWithImageIds = [];

        for (const alternative of alternativesPayload) {
          let imageFileId = alternative.existingImageFileId;

          if (alternative.imageFile) {
            const uploadedImage = await apiUploadFile('/uploaded-files/upload', {
              token,
              file: alternative.imageFile,
            });
            uploadedFileIds.push(uploadedImage.id);
            imageFileId = uploadedImage.id;
          }

          alternativesPayloadWithImageIds.push({
            ...alternative,
            imageFileId,
          });
        }

        await Promise.all(
          alternativesPayloadWithImageIds.map((alternative) =>
            alternative.existingId
              ? apiRequest(`/alternatives/${alternative.existingId}`, {
                  method: 'PATCH',
                  token,
                  body: {
                    questionId: savedQuestionId,
                    text: alternative.text,
                    type: alternative.type,
                    isCorrect: alternative.isCorrect,
                    ...(alternative.imageFileId
                      ? { imageFileId: alternative.imageFileId }
                      : {}),
                  },
                })
              : apiRequest('/alternatives', {
                  method: 'POST',
                  token,
                  body: {
                    questionId: savedQuestionId,
                    text: alternative.text,
                    type: alternative.type,
                    isCorrect: alternative.isCorrect,
                    ...(alternative.imageFileId
                      ? { imageFileId: alternative.imageFileId }
                      : {}),
                  },
                }),
          ),
        );

        if (isEditingMode && deletedAlternativeIds.length > 0) {
          await Promise.all(
            deletedAlternativeIds.map((alternativeId) =>
              apiRequest(`/alternatives/${alternativeId}`, {
                method: 'DELETE',
                token,
              }),
            ),
          );
        }
      } else if (isEditingMode && initialAlternativeIds.length > 0) {
        await Promise.all(
          initialAlternativeIds.map((alternativeId) =>
            apiRequest(`/alternatives/${alternativeId}`, {
              method: 'DELETE',
              token,
            }),
          ),
        );
      }

      closeAllModals();
      notify(
        isEditingMode
          ? 'Questão atualizada com sucesso'
          : isMultipleChoice
            ? 'Questão e alternativas criadas com sucesso'
            : 'Questão dissertativa criada com sucesso',
        'success',
      );
      await loadData();
    } catch (error) {
      if (!isEditingMode && savedQuestionId) {
        try {
          await apiRequest(`/questions/${savedQuestionId}`, {
            method: 'DELETE',
            token,
          });
        } catch {
          // noop
        }
      }

      if (uploadedFileIds.length > 0) {
        await Promise.allSettled(
          uploadedFileIds.map((fileId) =>
            apiRequest(`/uploaded-files/${fileId}`, {
              method: 'DELETE',
              token,
            }),
          ),
        );
      }

      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      notify(
        error.message ??
          (isEditingMode
            ? 'Erro ao atualizar questão'
            : 'Erro ao criar questão com alternativas'),
        'error',
      );
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleDeleteQuestion(question) {
    const confirmed = window.confirm(
      'Deseja realmente excluir esta questão? As alternativas, imagens e referências em provas e versões também serão removidas.',
    );

    if (!confirmed) {
      return;
    }

    setDeletingQuestionId(question.id);

    try {
      await apiRequest(`/questions/${question.id}`, {
        method: 'DELETE',
        token,
      });

      if (editingQuestionId === question.id) {
        closeAllModals();
        resetQuestionModalState();
      }

      notify('Questão excluída com sucesso', 'success');
      await loadData();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }

      notify(error.message ?? 'Erro ao excluir questão', 'error');
    } finally {
      setDeletingQuestionId('');
    }
  }

  return (
    <div className="page-grid">
      <header>
        <h1>Banco de questões</h1>
        <p className="muted">
          Clique em uma disciplina para destacar e filtrar as questões pelos
          tópicos dela. Clique em uma questão para editar.
        </p>
      </header>

      {loading ? <p>Carregando...</p> : null}

      <section className="kanban-grid">
        <article className="kanban-column card">
          <div className="kanban-column-header">
            <h2>Disciplinas</h2>
            <button type="button" className="icon-btn" onClick={openDisciplineModal}>
              +
            </button>
          </div>

          <label className="search-field" htmlFor="discipline-search">
            <span>Buscar disciplina pelo título</span>
            <input
              id="discipline-search"
              type="search"
              value={disciplineSearchTerm}
              onChange={(event) => setDisciplineSearchTerm(event.target.value)}
              placeholder="Digite o nome da disciplina"
            />
          </label>

          {disciplines.length === 0 ? <p>Nenhuma disciplina cadastrada.</p> : null}
          {disciplines.length > 0 && filteredDisciplines.length === 0 ? (
            <p>Nenhuma disciplina encontrada.</p>
          ) : null}

          <div className="kanban-list">
            {filteredDisciplines.map((discipline) => {
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
                    <div className="entity-actions">
                      <button
                        type="button"
                        className="icon-btn icon-btn-small"
                        title="Editar disciplina"
                        aria-label={`Editar disciplina ${discipline.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          openDisciplineModalForEdit(discipline);
                        }}
                      >
                        <PencilIcon className="button-icon" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-small"
                        title="Criar tópico"
                        aria-label={`Criar tópico em ${discipline.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          openTopicModalForDiscipline(discipline.id);
                        }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-small danger-btn"
                        title="Excluir disciplina"
                        aria-label={`Excluir disciplina ${discipline.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteDiscipline(discipline);
                        }}
                        disabled={deletingDisciplineId === discipline.id}
                      >
                        {deletingDisciplineId === discipline.id ? (
                          '...'
                        ) : (
                          <TrashIcon className="button-icon" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="muted">Tópicos: {topicsForDiscipline.length}</p>
                  {topicsForDiscipline.length > 0 ? (
                    <ul className="topic-inline-list">
                      {topicsForDiscipline.map((topic) => (
                        <li key={topic.id} className="topic-inline-item">
                          <span>{topic.name}</span>
                          <div className="topic-actions">
                            <button
                              type="button"
                              className="icon-btn icon-btn-small topic-action-btn topic-edit-btn"
                              title="Editar tópico"
                              aria-label={`Editar tópico ${topic.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openTopicModalForEdit(topic);
                              }}
                            >
                              <PencilIcon className="button-icon" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn-small topic-action-btn topic-delete-btn"
                              title="Excluir tópico"
                              aria-label={`Excluir tópico ${topic.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteTopic(topic);
                              }}
                              disabled={deletingTopicId === topic.id}
                            >
                              {deletingTopicId === topic.id ? (
                                '...'
                              ) : (
                                <TrashIcon className="button-icon" />
                              )}
                            </button>
                          </div>
                        </li>
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

          <label className="search-field" htmlFor="question-search">
            <span>Buscar questão pelo título</span>
            <input
              id="question-search"
              type="search"
              value={questionSearchTerm}
              onChange={(event) => setQuestionSearchTerm(event.target.value)}
              placeholder="Digite o texto da questão"
            />
          </label>

          {filteredQuestions.length === 0 ? (
            <p>
              {questions.length === 0
                ? 'Nenhuma questão cadastrada.'
                : hasQuestionFilters
                  ? 'Nenhuma questão encontrada para os filtros atuais.'
                  : 'Nenhuma questão cadastrada.'}
            </p>
          ) : null}

          <div className="kanban-list">
            {filteredQuestions.map((question) => {
              const topic = topicById[question.topicId];
              const discipline = topic
                ? disciplineById[topic.disciplineId]
                : undefined;

              return (
                <article
                  key={question.id}
                  className="kanban-item question-card"
                  onClick={() => openQuestionModalForEdit(question)}
                >
                  <div className="question-card-header">
                    <p className="question-main-text">{question.text}</p>
                    <button
                      type="button"
                      className="icon-btn icon-btn-small danger-btn"
                      title="Excluir questão"
                      aria-label="Excluir questão"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteQuestion(question);
                      }}
                      disabled={deletingQuestionId === question.id}
                    >
                      {deletingQuestionId === question.id ? (
                        '...'
                      ) : (
                        <TrashIcon className="button-icon" />
                      )}
                    </button>
                  </div>
                  <p className="question-meta-type">{formatQuestionType(question.type)}</p>

                  {(question.questionImages ?? []).length > 0 ? (
                    <div className="question-images-grid">
                      {question.questionImages.map((questionImage, index) => (
                        <AuthenticatedImage
                          key={questionImage.id}
                          token={token}
                          fileId={questionImage.fileId}
                          alt={`Imagem da questão ${index + 1}`}
                          className="question-image-preview"
                        />
                      ))}
                    </div>
                  ) : null}

                  <p className="muted">
                    Tópico: {topic?.name ?? '-'} | Disciplina:{' '}
                    {discipline?.name ?? '-'}
                  </p>

                  {question.type === 'DISSERTATIVE' ? (
                    <div className="form-grid">
                      <p className="muted">
                        Espaço de resposta: {formatAnswerSpaceSize(question.answerSpaceSize)}
                      </p>
                      <p>
                        <strong>Resposta:</strong> {question.answerText || '-'}
                      </p>
                    </div>
                  ) : (
                    <ul className="compact-list">
                      {(question.alternatives ?? []).map((alternative, index) => (
                        <li key={alternative.id}>
                          {optionLetter(index)}.{' '}
                          {alternative.type === 'IMAGE' && alternative.imageFileId ? (
                            <span className="alternative-image-inline">
                              <AuthenticatedImage
                                token={token}
                                fileId={alternative.imageFileId}
                                alt={`Alternativa ${optionLetter(index)}`}
                                className="alternative-image-preview"
                              />
                              {alternative.text ? <span>{alternative.text}</span> : null}
                            </span>
                          ) : (
                            alternative.text
                          )}{' '}
                          {alternative.isCorrect ? '(correta)' : ''}
                        </li>
                      ))}
                    </ul>
                  )}
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
              <h2>{isEditingDiscipline ? 'Editar disciplina' : 'Nova disciplina'}</h2>
              <button type="button" className="ghost-btn" onClick={closeAllModals}>
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveDiscipline} className="form-grid">
              <label htmlFor="modal-discipline-name">Nome</label>
              <input
                id="modal-discipline-name"
                type="text"
                value={disciplineName}
                onChange={(event) => setDisciplineName(event.target.value)}
                required
              />

              {!isEditingDiscipline ? (
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
              ) : null}

              <button type="submit" disabled={savingDiscipline}>
                {savingDiscipline
                  ? 'Salvando...'
                  : isEditingDiscipline
                    ? 'Salvar disciplina'
                    : 'Criar disciplina'}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {showTopicModal ? (
        <div className="modal-overlay" onClick={closeAllModals}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditingTopic ? 'Editar tópico' : 'Novo tópico'}</h2>
              <button type="button" className="ghost-btn" onClick={closeAllModals}>
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="form-grid">
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
                {savingTopic
                  ? 'Salvando...'
                  : isEditingTopic
                    ? 'Salvar tópico'
                    : 'Criar tópico'}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {showQuestionModal ? (
        <div className="modal-overlay" onClick={closeAllModals}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditingMode ? 'Editar questão' : 'Nova questão'}</h2>
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
                onChange={(event) => handleQuestionTypeChange(event.target.value)}
              >
                <option value="MULTIPLE_CHOICE">Múltipla escolha</option>
                <option value="DISSERTATIVE">Dissertativa</option>
              </select>

              <label htmlFor="modal-question-text">Enunciado da questão</label>
              <textarea
                id="modal-question-text"
                rows={4}
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                required
              />

              <fieldset>
                <legend>Imagens da questão</legend>
                <div className="form-grid">
                  {questionImageDrafts.map((questionImage, index) => (
                    <div key={questionImage.draftId} className="upload-row">
                      <label className="form-grid">
                        <span>Imagem {index + 1}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) =>
                            updateQuestionImageDraft(questionImage.draftId, {
                              file: event.target.files?.[0] ?? null,
                            })
                          }
                        />
                      </label>
                      {questionImage.file ? (
                        <p className="muted">Arquivo: {questionImage.file.name}</p>
                      ) : (
                        <p className="muted">Selecione uma imagem</p>
                      )}
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => removeQuestionImageDraft(questionImage.draftId)}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>

                <button type="button" className="ghost-btn" onClick={addQuestionImageDraft}>
                  + Adicionar imagem
                </button>
              </fieldset>

              {questionType === 'DISSERTATIVE' ? (
                <fieldset>
                  <legend>Resposta</legend>

                  <label htmlFor="modal-question-answer-text">Texto da resposta</label>
                  <textarea
                    id="modal-question-answer-text"
                    rows={4}
                    value={questionAnswerText}
                    onChange={(event) => setQuestionAnswerText(event.target.value)}
                    required
                  />

                  <label htmlFor="modal-question-answer-space-size">
                    Tamanho do espaço para resposta
                  </label>
                  <select
                    id="modal-question-answer-space-size"
                    value={questionAnswerSpaceSize}
                    onChange={(event) => setQuestionAnswerSpaceSize(event.target.value)}
                  >
                    <option value="SMALL">Pequeno</option>
                    <option value="MEDIUM">Médio</option>
                    <option value="LARGE">Grande</option>
                  </select>
                </fieldset>
              ) : (
                <fieldset>
                  <legend>Alternativas</legend>
                  <div className="form-grid">
                    {questionAlternatives.map((alternative, index) => (
                      <div key={alternative.draftId} className="alt-row">
                        {alternative.type === 'TEXT' ? (
                          <label className="form-grid">
                            <span>Texto da alternativa {optionLetter(index)}</span>
                            <input
                              type="text"
                              value={alternative.text}
                              onChange={(event) =>
                                updateAlternativeDraft(alternative.draftId, {
                                  text: event.target.value,
                                })
                              }
                              placeholder="Digite a alternativa"
                            />
                          </label>
                        ) : (
                          <label className="form-grid">
                            <span>Imagem da alternativa {optionLetter(index)}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(event) =>
                                updateAlternativeDraft(alternative.draftId, {
                                  imageFile: event.target.files?.[0] ?? null,
                                })
                              }
                            />
                            {alternative.imageFile ? (
                              <span className="muted">{alternative.imageFile.name}</span>
                            ) : (
                              <span className="muted">Selecione uma imagem</span>
                            )}
                          </label>
                        )}

                        <label className="form-grid">
                          <span>Tipo</span>
                          <select
                            value={alternative.type}
                            onChange={(event) => {
                              const nextType = event.target.value;
                              updateAlternativeDraft(alternative.draftId, {
                                type: nextType,
                                ...(nextType === 'TEXT'
                                  ? { imageFile: null, existingImageFileId: null }
                                  : {}),
                              });
                            }}
                          >
                            <option value="TEXT">Texto</option>
                            <option value="IMAGE">Imagem</option>
                          </select>
                        </label>

                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={alternative.isCorrect}
                            onChange={(event) =>
                              updateAlternativeDraft(alternative.draftId, {
                                isCorrect: event.target.checked,
                              })
                            }
                          />
                          Correta
                        </label>

                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => removeAlternativeDraft(alternative.draftId)}
                          disabled={questionAlternatives.length <= 2}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={addAlternativeDraft}
                  >
                    Adicionar alternativa
                  </button>
                </fieldset>
              )}

              <button
                type="submit"
                disabled={savingQuestion || !questionTopicId}
              >
                {savingQuestion
                  ? 'Salvando...'
                  : isEditingMode
                    ? 'Salvar'
                    : 'Criar questão'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
