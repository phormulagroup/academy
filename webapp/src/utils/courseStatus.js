import dayjs from "dayjs";
import { courseAccessState } from "./courseWindow";

/**
 * Regras partilhadas de estado de cursos e testes (catálogo, detalhe do curso, eLearning e resultados).
 * Mesma lógica de "reprovado" dos relatórios do backoffice (pages/admin/report/courseReport.jsx).
 */

// settings pode vir em string (BD) ou já em objeto
export function parseSettings(settings) {
  if (!settings) return {};
  if (typeof settings === "string") {
    try {
      return JSON.parse(settings) || {};
    } catch {
      return {};
    }
  }
  return settings;
}

/**
 * @function isTestFailed
 * @description Teste reprovado: tem limite de tentativas (retries_allowed > 0), nenhuma tentativa aprovada
 * e as tentativas falhadas atingiram o limite.
 * @param {Array} progress - Atividade do utilizador (course_user_activity).
 * @param {object} test - Teste (id, settings).
 * @returns {boolean}
 */
export function isTestFailed(progress, test) {
  const settings = parseSettings(test?.settings);
  const retries = Number(settings.retries_allowed);
  if (!retries || retries <= 0) return false;
  const attempts = (progress || []).filter(
    (p) =>
      p.activity_type === "test" &&
      p.id_course_test === test.id &&
      p.is_deleted !== 1,
  );
  if (attempts.some((p) => p.is_completed === 1)) return false;
  const failed = attempts.filter((p) => p.is_completed === 0).length;
  return failed > 0 && failed >= retries;
}

/**
 * @function isCourseFailed
 * @description Aluno reprovado no curso: reprovou (esgotou as tentativas) em pelo menos um teste do curso.
 * @param {Array} progress - Atividade do utilizador no curso.
 * @param {Array} tests - Testes do curso.
 * @returns {boolean}
 */
export function isCourseFailed(progress, tests) {
  return (tests || []).some((test) => isTestFailed(progress, test));
}

/**
 * @function courseDateState
 * @description Validade do curso (definições "Course access expiration": start_date / end_date).
 * @param {object} course - Curso com settings (objeto ou string).
 * @returns {"upcoming"|"active"|"expired"} upcoming: antes da data de início; expired: depois da data de fim.
 */
export function courseDateState(course) {
  // Mesma regra de utils/courseWindow (courseAccessState): "open" | "not_started" | "ended"
  const state = courseAccessState(parseSettings(course?.settings));
  return state === "not_started" ? "upcoming" : state === "ended" ? "expired" : "active";
}

/**
 * @function testDateState
 * @description Disponibilidade do teste (definições do teste: start_date / end_date).
 * @param {object} test - Teste com settings (objeto ou string).
 * @returns {"upcoming"|"active"|"expired"}
 */
export function testDateState(test) {
  const { start_date, end_date } = parseSettings(test?.settings);
  const now = dayjs();
  if (start_date && now.isBefore(dayjs(start_date))) return "upcoming";
  if (end_date && now.isAfter(dayjs(end_date))) return "expired";
  return "active";
}

/**
 * @function isAllowedByCountry
 * @description Restrição de países (curso, material ou documento): sem restrição -> todos; com restrição ->
 * só utilizadores desses países (alunos e admin).
 * @param {Array|null} countries - Países da restrição (vazio/null = sem restrição).
 * @param {object} user - Utilizador autenticado (country).
 * @returns {boolean}
 */
export function isAllowedByCountry(countries, user) {
  if (!countries || countries.length === 0) return true;
  return countries.includes(user?.country);
}
