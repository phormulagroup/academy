import axios from "axios";
import config from "./config";
import "./serverStatus"; // regista os interceptores que detetam o servidor em baixo
import { setupServerClock } from "./serverClock";

setupServerClock();

// A sessão vai no cookie HttpOnly (a API põe-no no login): o axios envia-o em todos os pedidos. O cabeçalho X-Requested-With
// identifica pedidos desta webapp (a API exige-o nos que alteram dados, como defesa contra CSRF).
axios.defaults.withCredentials = true;
axios.defaults.headers.common["X-Requested-With"] = "academy-webapp";

const api = {
  init: () => {
    return new Promise((resolve, reject) => {
      axios.defaults.baseURL = config.server_ip;
      axios
        .get("/")
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  },
};

export default api;
