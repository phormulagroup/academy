// Variáveis mínimas para os módulos que as exigem ao carregar (nunca toca na base de dados nem em ficheiros .env)
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-test-secret-test-secret-0123456789";
process.env.NODE_ENV = "test";
delete process.env.IDLE_MINUTES;
delete process.env.SESSION_HOURS;
delete process.env.API_PREFIX;
