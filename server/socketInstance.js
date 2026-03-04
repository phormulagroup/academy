let socketInstance = null;

function setSocketInstance(instance) {
  socketInstance = instance;
}

function getSocketInstance() {
  return socketInstance;
}

module.exports = { setSocketInstance, getSocketInstance };
