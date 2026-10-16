// Percentagens arredondadas às unidades em toda a plataforma (site e backoffice)

// Estatísticas (médias, taxas de aprovação, quotas): arredondamento normal

/**
 * @function roundPercent
 * @description Rounds a percentage value to the nearest whole number.
 * @param {number} value - The percentage value to round.
 * @returns {number} The rounded percentage value.
 */

export const roundPercent = (value) => Math.round(Number(value) || 0);

// Progresso de cursos/módulos: às unidades, mas só mostra 100% quando está mesmo completo (99,6% → 99%, e não 100%)

/**
 * @function progressPercent
 * @description Rounds a progress percentage to the nearest whole number, but only shows 100% when the value is actually 100%.
 * @param {number} value - The progress percentage value to round.
 * @returns {number} The rounded progress percentage value, capped at 99% unless it is 100%.
 */

export const progressPercent = (value) => {
  const n = Number(value) || 0;
  return n >= 100 ? 100 : Math.min(99, Math.round(n));
};

// Notas de testes e disponibilidade: arredonda para baixo, para nunca parecer acima do valor real
// (ex.: 74,6% num teste com nota mínima de 75% mostra 74%, e não 75% "reprovado")
/**
 * @function floorPercent
 * @description Rounds a percentage value down to the nearest whole number, ensuring it never appears higher than the actual value.
 * @param {number} value - The percentage value to round down.
 * @returns {number} The rounded down percentage value.
 */
export const floorPercent = (value) => Math.floor(Number(value) || 0);

// Progresso de uma lista de tópicos/testes visíveis (itens dos módulos que existem e o aluno vê): cada item conta uma só vez,
// mesmo com registos de conclusão repetidos, e só contam conclusões de itens da lista (não de itens apagados, retirados do
// módulo, em rascunho ou escondidos pelo país), por isso nunca passa de 100% nem de n/n passos
/**
 * @function itemsProgress
 * @description Counts the distinct completed items of a list of visible topics/tests.
 * @param {Array} items - Visible items ({ type: "topic" | "test", id }).
 * @param {Array} progress - User activity (course_user_activity rows).
 * @returns {{done: number, total: number, percent: number}} Distinct completed items, distinct items and the progress percentage (progressPercent).
 */
export function itemsProgress(items, progress) {
  const keys = new Set((items || []).filter((i) => i.type === "topic" || i.type === "test").map((i) => `${i.type}_${i.id}`));
  const done = new Set(
    (progress || [])
      .filter((p) => p.is_completed === 1 && p.is_deleted !== 1 && (p.activity_type === "topic" || p.activity_type === "test"))
      .map((p) => `${p.activity_type}_${p[`id_course_${p.activity_type}`]}`)
      .filter((key) => keys.has(key)),
  );
  return { done: done.size, total: keys.size, percent: keys.size > 0 ? progressPercent((100 * done.size) / keys.size) : 0 };
}
