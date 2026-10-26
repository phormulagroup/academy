const config = {
  // Em staging/produção define-se VITE_API_URL no build (ex.: https://academy.bial.com/api)
  // Sem VITE_API_URL (desenvolvimento) usa a API na porta 4000 do mesmo endereço da página: o cookie da sessão só segue no mesmo "site"
  // (localhost com localhost; localhost com 127.0.0.1 já não)
  server_ip: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000`,
};

export default config;
