// Datas dos testes. O admin define-as na hora de Lisboa (referência) e guardam-se como instantes absolutos (ISO em UTC, ex.: 2026-10-28T13:54:00.000Z):
// cada pessoa vê a mesma data na sua hora local e o servidor decide pelo mesmo instante, sem depender do fuso do alojamento.
// Um país pode ter datas próprias (settings.country_dates[país] = { start_date, end_date }), escritas na hora desse país.
// Valores antigos sem fuso (ex.: 2026-10-28T14:54) leem-se como hora de Lisboa.
// ATENÇÃO: o mesmo código existe em server/utils/testSchedule.js e webapp/src/utils/testSchedule.js (mantê-los iguais; os testes comparam-nos).

const REFERENCE_TZ = "Europe/Lisbon";

// Diferença (minutos) entre a hora de parede de um fuso e o UTC, num instante
function offsetMinutes(timeZone, ms) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

// Hora de parede (ano, mês 1-12, dia, hora, minuto) num fuso → instante (ms). Resolve as passagens de hora de verão
function wallToInstant(year, month, day, hour, minute, timeZone = REFERENCE_TZ) {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wallAsUtc - offsetMinutes(timeZone, wallAsUtc) * 60000;
  guess = wallAsUtc - offsetMinutes(timeZone, guess) * 60000;
  return guess;
}

const WALL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

// Valor guardado → instante (ms) ou null. Com Z ou desvio (+01:00) é absoluto; sem fuso é hora de parede no fuso dado (por omissão Lisboa)
function parseInstant(value, timeZone = REFERENCE_TZ) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  const wall = WALL.exec(text);
  if (wall) return wallToInstant(Number(wall[1]), Number(wall[2]), Number(wall[3]), Number(wall[4]), Number(wall[5]), timeZone);
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : ms;
}

// Instante (ms) → "YYYY-MM-DDTHH:mm" na hora de parede de um fuso
function instantToWall(ms, timeZone = REFERENCE_TZ) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(ms));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function parseSettings(settings) {
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

// Fuso de um país (por nome em inglês, como na conta do utilizador); desconhecido = Lisboa
function countryTimeZone(country, zones) {
  return (zones && zones[country]) || REFERENCE_TZ;
}

/**
 * Janela de disponibilidade de um teste para uma pessoa: { start, end } em ms (null = sem limite).
 * Se o teste tem datas para o país da pessoa, essas mandam (cada lado, início e fim, à parte); senão valem as de Lisboa.
 */
function testWindow(settings, country, zones) {
  const s = parseSettings(settings);
  const own = country && s.country_dates && typeof s.country_dates === "object" ? s.country_dates[country] : null;
  const tz = countryTimeZone(country, zones);
  const pick = (key) => {
    if (own && own[key]) return parseInstant(own[key], tz);
    return parseInstant(s[key]);
  };
  return { start: pick("start_date"), end: pick("end_date") };
}

// "upcoming" (ainda não abriu), "expired" (já fechou) ou "active"
function testState(settings, country, zones, nowMs = Date.now()) {
  const { start, end } = testWindow(settings, country, zones);
  if (start !== null && nowMs < start) return "upcoming";
  if (end !== null && nowMs > end) return "expired";
  return "active";
}

module.exports = { REFERENCE_TZ, offsetMinutes, wallToInstant, parseInstant, instantToWall, testWindow, testState, countryTimeZone, parseSettings };
