import React, { useContext, useEffect, useState } from "react";
import { createContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import endpoints from "./endpoints";
import api from "./api";
import { message, Tour } from "antd";

// MSAL imports
import { useRef } from "react";

export const Context = createContext();

api.init();

const ContextProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState({});
  const [courses, setCourses] = useState([]);

  const [tablesName] = useState({ user: "Utilizador", course: "Curso" });

  const [messageApi, contextHolder] = message.useMessage();

  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    let token = localStorage.getItem("token");
    if (token) {
      axios
        .post(endpoints.auth.verifyToken, {
          data: token,
        })
        .then((res) => {
          console.log(res);
          if (res.data.token_valid) {
            login({ user: res.data.user, token: token });
          } else {
            setIsLoggedIn(false);
            navigate("/login");
          }
          setTimeout(() => {
            setIsLoading(false);
          }, 1500);
        })
        .catch((err) => {
          console.log(err);
          setTimeout(() => {
            setIsLoading(false);
          }, 1500);
        });
    } else {
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    }
  }

  async function getInfoData(token) {
    try {
      const coursesList = await axios.get(endpoints.user.read, { headers: { Authorization: token } });
      setCourses(coursesList.data);
    } catch (err) {
      console.log(err);
    }
  }

  async function logout() {
    localStorage.removeItem("token");
    const auxUser = JSON.parse(JSON.stringify(user));
    setIsLoggedIn(false);
    setIsLoading(true);
    setUser({});
    navigate("/login");
    createLog({ id_user: auxUser.id, action: "logout" });
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }

  function login(res) {
    localStorage.setItem("token", res.token);
    api.token(res.token);
    getInfoData(res.token);
    setUser(res.user);
    setIsLoggedIn(true);
    if (window.location.href.includes("login")) navigate("/app");
    else navigate(window.location.href);
  }

  async function createLog(obj) {
    try {
      if (user.id) {
        if (obj.action !== "update") {
          await axios.post(endpoints.logs.create, { data: { modified_by: user.id, ...obj } });
        } else {
          if (obj.action === "update" && obj.changed && obj.changed.old && obj.changed.new) {
            const old = Object.keys(obj.changed.new).reduce((acc, key) => {
              if (obj.changed.old.hasOwnProperty(key)) {
                acc[key] = obj.changed.old[key];
              }
              return acc;
            }, {});

            obj.changed.old = old;
          }

          await axios.post(endpoints.logs.create, {
            data: { ...obj, modified_by: user.id, changed: JSON.stringify(obj.changed) },
          });
        }
      } else {
        if (obj.action === "login") {
          await axios.post(endpoints.logs.create, {
            data: { ...obj, modified_by: obj.id_user },
          });
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  function create(obj) {
    return new Promise(async (resolve, reject) => {
      console.log(obj);
      try {
        const res = await axios.post(endpoints[obj.table].create, { data: obj.data });
        /*createLog({
          action: "create",
          changed: null,
          type: obj.table,
          [`id_${obj.table}`]: res.insertId,
        });*/
        messageApi.open({
          type: "success",
          content: `${obj.table.charAt(0).toUpperCase() + obj.table.slice(1)} criado com sucesso!`,
        });
        resolve(res);
      } catch (err) {
        messageApi.open({
          type: "error",
          content: `Algo correu mal ao editar o ${obj.table}.`,
        });
        reject(err);
      }
    });
  }

  function update(obj, changed) {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await axios.post(endpoints[obj.table].update, { data: obj.data });
        createLog({
          action: "update",
          changed: changed,
          type: obj.table,
          [`id_${obj.table}`]: obj.data.id,
        });
        messageApi.open({
          type: "success",
          content: `${tablesName[obj.table]} foi editado com sucesso.`,
        });
        resolve(res);
      } catch (err) {
        messageApi.open({
          type: "error",
          content: `Algo correu mal ao editar o ${obj.table}.`,
        });
        reject(err);
      }
    });
  }

  return (
    <Context.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        user,
        setUser,
        login,
        logout,
        isLoading,
        setIsLoading,
        messageApi,
        createLog,
        update,
        create,
        courses,
        setCourses,
      }}
    >
      {contextHolder}
      {children}
    </Context.Provider>
  );
};

export default ContextProvider;
