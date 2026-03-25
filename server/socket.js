const { Server } = require("socket.io");

const connectedUsers = new Map(); // userId → {socketId, id_lang, id_role, country}

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      //origin: "*", // altera depois para domínio real
      origin: "http://192.168.1.90:5173",
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Novo cliente:", socket.id);

    socket.on("register_user", ({ userId, lang, country, id_role }) => {
      connectedUsers.set(userId, { socketId: socket.id, lang, country, id_role });
      console.log(`User ID: ${userId} | ID Role: ${id_role} | Lang: ${lang} | Country: ${country} ⇒ Socket ${socket.id}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Cliente desconectado:", socket.id);

      for (const [userId, user] of connectedUsers.entries()) {
        if (user.socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
    });
  });

  function notifyUser(data, userId) {
    const user = connectedUsers.get(userId);
    console.log(user);
    if (user && user.socketId) {
      io.to(user.socketId).emit("received", { ...data, is_read: 0 });
    }
  }

  function notifyAllUsers(data) {
    const users = new Map([...connectedUsers].filter(([, info]) => info.lang === data.id_lang));

    for (const [_, obj] of users.entries()) {
      io.to(obj.socketId).emit("received", { ...data, is_read: 0 });
    }
  }

  function notifyByRoleId(data, id_role) {
    const users = new Map([...connectedUsers].filter(([, info]) => info.lang === data.id_lang && info.id_role === id_role));

    for (const [_, obj] of users.entries()) {
      io.to(obj.socketId).emit("received", { ...data, is_read: 0 });
    }
  }

  function notifyByCountry(data, country) {
    const users = new Map([...connectedUsers].filter(([, info]) => info.lang === data.id_lang && info.country === country));

    for (const [_, obj] of users.entries()) {
      io.to(obj.socketId).emit("received", { ...data, is_read: 0 });
    }
  }

  // exportar funções úteis
  return {
    notifyUser,
    notifyAllUsers,
    notifyByRoleId,
    notifyByCountry,
    io,
    connectedUsers,
  };
}

module.exports = setupSocket;
