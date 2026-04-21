import { AnswerSpaceSize } from '@prisma/client';

type ExamPdfConfig = {
  pageSize: string;
  baseFontSize: number;
  textColor: string;
  mutedColor: string;
  subtleTextColor: string;
  borderColor: string;
  answerSpaceBorderColor: string;
  accentColor: string;
  imageFallbackColor: string;
  answerSpaceHeights: Record<AnswerSpaceSize, number>;
};

function readStringEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function readPositiveNumberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getExamPdfConfig(): ExamPdfConfig {
  return {
    pageSize: readStringEnv('APP_PDF_PAGE_SIZE', 'A4'),
    baseFontSize: readPositiveNumberEnv('APP_PDF_BASE_FONT_SIZE', 9.5),
    textColor: readStringEnv('APP_THEME_INK', '#142218'),
    mutedColor: readStringEnv('APP_PDF_MUTED_COLOR', '#4f5c52'),
    subtleTextColor: readStringEnv('APP_PDF_SUBTLE_TEXT_COLOR', '#59665c'),
    borderColor: readStringEnv('APP_PDF_BORDER_COLOR', '#cbd5cc'),
    answerSpaceBorderColor: readStringEnv(
      'APP_PDF_ANSWER_SPACE_BORDER_COLOR',
      '#aeb9af',
    ),
    accentColor: readStringEnv('APP_THEME_PRIMARY', '#116042'),
    imageFallbackColor: readStringEnv(
      'APP_PDF_IMAGE_FALLBACK_COLOR',
      '#6d776d',
    ),
    answerSpaceHeights: {
      [AnswerSpaceSize.SMALL]: readPositiveNumberEnv(
        'APP_DISSERTATIVE_SPACE_SMALL_HEIGHT',
        70,
      ),
      [AnswerSpaceSize.MEDIUM]: readPositiveNumberEnv(
        'APP_DISSERTATIVE_SPACE_MEDIUM_HEIGHT',
        120,
      ),
      [AnswerSpaceSize.LARGE]: readPositiveNumberEnv(
        'APP_DISSERTATIVE_SPACE_LARGE_HEIGHT',
        190,
      ),
    },
  };
}
