import { describe, expect, it, beforeEach, vi } from "vitest";

// localStorage mínimo (os testes correm sem DOM)
function installStorage(initial = {}) {
  const data = { ...initial };
  vi.stubGlobal("localStorage", {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  });
  return data;
}

const load = async () => {
  vi.resetModules();
  return import("./sessionStore");
};

describe("sessionStore", () => {
  beforeEach(() => installStorage());

  it("guarda só quando a sessão termina e a inatividade permitida", async () => {
    const data = installStorage();
    const store = await load();
    store.saveSession({ expires_at: 2000000000, idle_minutes: 45 });
    expect(JSON.parse(data.session)).toEqual({ exp: 2000000000, idle: 45 });
    expect(store.getStoredSession()).toEqual({ exp: 2000000000, idle: 45 });
    expect(store.hasStoredSession()).toBe(true);
    expect(Object.keys(JSON.parse(data.session))).not.toContain("token");
  });

  it("inatividade por omissão 30 minutos e ignora sessões sem fim", async () => {
    const store = await load();
    store.saveSession({ expires_at: 2000000000 });
    expect(store.getStoredSession().idle).toBe(30);
    store.clearStoredSession();
    store.saveSession({});
    expect(store.hasStoredSession()).toBe(false);
  });

  it("sessionEnded compara com o momento atual", async () => {
    const store = await load();
    const now = Date.now();
    expect(store.sessionEnded({ exp: now / 1000 - 5, idle: 30 }, now)).toBe(true);
    expect(store.sessionEnded({ exp: now / 1000 + 600, idle: 30 }, now)).toBe(false);
    expect(store.sessionEnded(null)).toBe(false);
  });

  it("dados corrompidos não rebentam", async () => {
    installStorage({ session: "{lixo" });
    const store = await load();
    expect(store.getStoredSession()).toBeNull();
  });

  it("lê e apaga o token antigo (sessões guardadas antes dos cookies)", async () => {
    const data = installStorage({ token: "abc.def.ghi" });
    const store = await load();
    expect(store.getLegacyToken()).toBe("abc.def.ghi");
    store.clearLegacyToken();
    expect(data.token).toBeUndefined();
  });

  it("sem armazenamento disponível não rebenta", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    });
    const store = await load();
    expect(() => store.saveSession({ expires_at: 2000000000 })).not.toThrow();
    expect(store.getStoredSession()).toBeNull();
    expect(() => store.clearStoredSession()).not.toThrow();
  });
});
