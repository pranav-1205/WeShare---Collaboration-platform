import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

let socketInstance = null;

export function getSocket(authToken = null) {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, {
      auth: { token: authToken },
      transports: ["websocket", "polling"],
    });
  } else if (authToken) {
    socketInstance.auth = { token: authToken };
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export default getSocket();