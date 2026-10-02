import dayjs from "dayjs";

// Janela de disponibilidade de um curso (settings.course_access_expiration_dates). As duas datas são opcionais: sem
// nenhuma o curso está sempre aberto; com uma só, só se limita esse lado.
// Devolve "open", "not_started" (ainda não abriu) ou "ended" (já fechou).
export function courseAccessState(settings) {
  if (!settings?.course_access_expiration) return "open";
  const { start_date, end_date } = settings.course_access_expiration_dates || {};
  const now = dayjs();
  if (start_date && now.isBefore(dayjs(start_date))) return "not_started";
  if (end_date && now.isAfter(dayjs(end_date))) return "ended";
  return "open";
}
