const { Server } = require("socket.io");

const connectedUsers = new Map(); // userId → socketId

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // altera depois para domínio real
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Novo cliente:", socket.id);

    socket.on("register_user", ({ userId, lang, country }) => {
      connectedUsers.set(userId, { socketId: socket.id, lang, country });
      console.log(`User ID: ${userId} | Lang: ${lang} | Country: ${country} ⇒ Socket ${socket.id}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Cliente desconectado:", socket.id);

      for (const [userId, sId] of connectedUsers.entries()) {
        if (sId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
    });
  });

  // Função para enviar notificação a um utilizador específico
  function notifyUser(userId, data) {
    const socketId = connectedUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit("received", data);
    }
  }

  function notifyAllUsers(data) {
    console.log(connectedUsers);
    for (const [userId, obj] of connectedUsers.entries()) {
      console.log(obj.socketId);
      io.to(obj.socketId).emit("received", data);
    }
  }

  // exportar funções úteis
  return {
    notifyUser,
    notifyAllUsers,
    io,
    connectedUsers,
  };
}

module.exports = setupSocket;
