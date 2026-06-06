export type ExamVersionOrderData = {
  questions: Array<{
    questionId: string;
    position: number;
    alternatives: Array<{
      alternativeId: string;
      position: number;
    }>;
  }>;
};

export type QuestionForExamOrder = {
  id: string;
  alternatives: Array<{ id: string; isCorrect: boolean }>;
};

type BuildOrderDataOptions = {
  shuffleAlternatives: boolean;
  distributeCorrectAlternatives: boolean;
  shuffleArray: <T>(array: T[]) => T[];
};

function buildBalancedCorrectPositions(
  questionsCount: number,
  alternativesCount: number,
  shuffleArray: <T>(array: T[]) => T[],
): number[] {
  const baseCountByPosition = Math.floor(questionsCount / alternativesCount);
  const remainingPositionsCount = questionsCount % alternativesCount;
  const positions = Array.from(
    { length: alternativesCount },
    (_, index) => index,
  );
  const balancedPositions = positions.flatMap((position) =>
    Array.from({ length: baseCountByPosition }, () => position),
  );

  balancedPositions.push(
    ...shuffleArray(positions).slice(0, remainingPositionsCount),
  );

  return shuffleArray(balancedPositions);
}

function arrangeAlternativesWithCorrectAtPosition(
  alternatives: QuestionForExamOrder['alternatives'],
  correctPosition: number,
  shuffleArray: <T>(array: T[]) => T[],
): QuestionForExamOrder['alternatives'] {
  const correctAlternatives = alternatives.filter(
    (alternative) => alternative.isCorrect,
  );
  const correctAlternative = shuffleArray(correctAlternatives)[0];
  const remainingAlternatives = shuffleArray(
    alternatives.filter(
      (alternative) => alternative.id !== correctAlternative.id,
    ),
  );
  const orderedAlternatives: QuestionForExamOrder['alternatives'] = [];
  let remainingAlternativeIndex = 0;

  for (let index = 0; index < alternatives.length; index += 1) {
    orderedAlternatives.push(
      index === correctPosition
        ? correctAlternative
        : remainingAlternatives[remainingAlternativeIndex],
    );

    if (index !== correctPosition) {
      remainingAlternativeIndex += 1;
    }
  }

  return orderedAlternatives;
}

function buildDistributedAlternativesByQuestionId(
  questions: QuestionForExamOrder[],
  shuffleArray: <T>(array: T[]) => T[],
): Map<string, QuestionForExamOrder['alternatives']> {
  const questionsByAlternativesCount = new Map<
    number,
    QuestionForExamOrder[]
  >();

  for (const question of questions) {
    if (question.alternatives.length === 0) {
      continue;
    }

    const currentQuestions =
      questionsByAlternativesCount.get(question.alternatives.length) ?? [];
    currentQuestions.push(question);
    questionsByAlternativesCount.set(
      question.alternatives.length,
      currentQuestions,
    );
  }

  const alternativesByQuestionId = new Map<
    string,
    QuestionForExamOrder['alternatives']
  >();

  [...questionsByAlternativesCount.entries()]
    .sort(([firstCount], [secondCount]) => secondCount - firstCount)
    .forEach(([alternativesCount, groupedQuestions]) => {
      const correctPositions = buildBalancedCorrectPositions(
        groupedQuestions.length,
        alternativesCount,
        shuffleArray,
      );

      groupedQuestions.forEach((question, index) => {
        alternativesByQuestionId.set(
          question.id,
          arrangeAlternativesWithCorrectAtPosition(
            question.alternatives,
            correctPositions[index],
            shuffleArray,
          ),
        );
      });
    });

  return alternativesByQuestionId;
}

export function buildExamVersionOrderData(
  questions: QuestionForExamOrder[],
  options: BuildOrderDataOptions,
): ExamVersionOrderData {
  const distributedAlternativesByQuestionId =
    options.shuffleAlternatives && options.distributeCorrectAlternatives
      ? buildDistributedAlternativesByQuestionId(
          questions,
          options.shuffleArray,
        )
      : new Map<string, QuestionForExamOrder['alternatives']>();

  return {
    questions: questions.map((question, questionIndex) => {
      const alternatives =
        distributedAlternativesByQuestionId.get(question.id) ??
        (options.shuffleAlternatives
          ? options.shuffleArray(question.alternatives)
          : [...question.alternatives]);

      return {
        questionId: question.id,
        position: questionIndex + 1,
        alternatives: alternatives.map((alternative, alternativeIndex) => ({
          alternativeId: alternative.id,
          position: alternativeIndex + 1,
        })),
      };
    }),
  };
}
