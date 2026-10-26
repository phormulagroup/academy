import { describe, expect, it } from "vitest";
import { parseInstant, instantToWall, wallToInstant, testWindow, testState } from "./testSchedule";
import zones from "./countryTimezones.json";
import { syncServerClock, serverNow, getServerOffset } from "./serverClock";

const iso = (ms) => new Date(ms).toISOString();

describe("testSchedule (as mesmas regras do servidor)", () => {
  it("Lisboa: inverno = UTC, verão = UTC+1; datas com Z são absolutas", () => {
    expect(iso(parseInstant("2026-12-10T10:00"))).toBe("2026-12-10T10:00:00.000Z");
    expect(iso(parseInstant("2026-07-01T10:00"))).toBe("2026-07-01T09:00:00.000Z");
    expect(iso(parseInstant("2026-10-28T13:54:00.000Z"))).toBe("2026-10-28T13:54:00.000Z");
    expect(parseInstant("")).toBeNull();
  });

  it("o mesmo instante lê-se em cada fuso (ida e volta)", () => {
    const ms = parseInstant("2026-12-10T10:00");
    expect(instantToWall(ms, "Europe/Lisbon")).toBe("2026-12-10T10:00");
    expect(instantToWall(ms, "Africa/Luanda")).toBe("2026-12-10T11:00");
    expect(instantToWall(ms, "America/Sao_Paulo")).toBe("2026-12-10T07:00");
    expect(instantToWall(wallToInstant(2026, 12, 10, 9, 30, "Africa/Maputo"), "Africa/Maputo")).toBe("2026-12-10T09:30");
  });

  it("países com datas próprias; os outros seguem Lisboa", () => {
    const settings = { start_date: "2026-12-10T10:00", end_date: "2026-12-20T18:00", country_dates: { Angola: { start_date: "2026-12-10T09:00" } } };
    expect(iso(testWindow(settings, "Angola", zones).start)).toBe("2026-12-10T08:00:00.000Z");
    expect(iso(testWindow(settings, "Angola", zones).end)).toBe("2026-12-20T18:00:00.000Z");
    expect(iso(testWindow(settings, "Portugal", zones).start)).toBe("2026-12-10T10:00:00.000Z");
  });

  it("estado: antes, durante e depois", () => {
    const settings = { start_date: "2026-12-10T10:00", end_date: "2026-12-20T18:00" };
    expect(testState(settings, "Portugal", zones, Date.parse("2026-12-10T09:59:59Z"))).toBe("upcoming");
    expect(testState(settings, "Portugal", zones, Date.parse("2026-12-15T12:00:00Z"))).toBe("active");
    expect(testState(settings, "Portugal", zones, Date.parse("2026-12-20T18:00:01Z"))).toBe("expired");
  });
});

describe("serverClock", () => {
  it("acerta o relógio pela hora do servidor (cabeçalho Date)", () => {
    const now = Date.now();
    // Servidor 5 min à frente do computador
    syncServerClock(new Date(now + 5 * 60 * 1000).toUTCString(), now - 100, now + 100);
    expect(Math.abs(getServerOffset() - 5 * 60 * 1000)).toBeLessThan(1000);
    expect(Math.abs(serverNow() - (Date.now() + 5 * 60 * 1000))).toBeLessThan(1500);
  });

  it("ignora cabeçalhos inválidos", () => {
    const before = getServerOffset();
    syncServerClock("lixo", Date.now(), Date.now());
    expect(getServerOffset()).toBe(before);
  });
});
