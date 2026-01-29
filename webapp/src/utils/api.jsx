import axios from "axios";
import config from "./config";

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

  token: (token) => {
    return new Promise((resolve, reject) => {
      if (token) {
        console.log(token);
        axios.defaults.headers.common["Authorization"] = token;
        resolve(token);
      } else {
        reject("No token!");
      }
    });
  },
};

export default api;
