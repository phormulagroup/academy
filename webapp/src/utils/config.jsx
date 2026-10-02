const config = {
  // Em staging/produção define-se VITE_API_URL no build (ex.: https://academy.bial.com/api)
  server_ip: import.meta.env.VITE_API_URL || "http://127.0.0.1:4000",
};

export default config;
