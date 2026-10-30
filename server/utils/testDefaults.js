// Definições por omissão dos testes (course_test.settings): duração, percentagem mínima de aprovação e número de tentativas.
// As tentativas dependem do idioma do curso: em português e francês é 1 (não se pode repetir); em espanhol e inglês é 2 (faz-se uma vez e
// pode repetir-se uma). `retries_allowed` conta as tentativas no total (o teste fica bloqueado quando as reprovadas chegam a esse número).
const TEST_TIME_MINUTES = 45;
const TEST_PASSING_SCORE = 75;
const ATTEMPTS_BY_LANGUAGE = { pt: 1, fr: 1, es: 2, en: 2 };

// Tentativas do idioma (código "pt", "es"...), ou undefined num idioma sem regra (nesse caso não se limita)
const attemptsFor = (languageCode) => ATTEMPTS_BY_LANGUAGE[String(languageCode || "").toLowerCase()];

// Definições de um teste novo no idioma indicado
function defaultTestSettings(languageCode) {
  const attempts = attemptsFor(languageCode);
  return {
    time: TEST_TIME_MINUTES,
    passing_score: TEST_PASSING_SCORE,
    ...(attempts !== undefined && { retries_allowed: attempts }),
    randomize_answers: false,
    randomize_questions: false,
    show_correct_answers: false,
  };
}

// Código do idioma do curso (para as tentativas por omissão dos testes novos)
async function courseLanguageCode(query, idCourse) {
  const [row] = await query("SELECT language.code FROM course JOIN language ON language.id = course.id_lang WHERE course.id = ?", [idCourse]);
  return row?.code;
}

// Cópia de um teste para outro idioma: as tentativas passam a ser as do novo idioma (o resto das definições mantém-se)
function settingsForLanguage(settings, languageCode) {
  const attempts = attemptsFor(languageCode);
  if (attempts === undefined) return settings;
  let parsed = {};
  try {
    parsed = typeof settings === "string" ? JSON.parse(settings || "{}") : settings || {};
  } catch {
    return settings;
  }
  return JSON.stringify({ ...parsed, retries_allowed: attempts });
}

module.exports = { TEST_TIME_MINUTES, TEST_PASSING_SCORE, ATTEMPTS_BY_LANGUAGE, attemptsFor, defaultTestSettings, courseLanguageCode, settingsForLanguage };
