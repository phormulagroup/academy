import { io } from "socket.io-client";

export const socket = io("http://localhost:4000" /*"http://192.168.1.90:4000"*/, {
  autoConnect: false, // reconectar automaticamente
  reconnection: true, // tenta sempre reconectar
  reconnectionAttempts: 10, // número de tentativas
  reconnectionDelay: 1000, // 1 segundo entre tentativas
  reconnectionDelayMax: 5000, // máximo 5 seg
});
