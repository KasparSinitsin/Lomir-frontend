import { io } from "socket.io-client";

let socket = null;
const SOCKET_READY_EVENT = "lomir:socket-ready";

const notifySocketReady = (socketInstance) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SOCKET_READY_EVENT, { detail: { socket: socketInstance } }),
  );
};

const socketService = {
  // Connect to the socket server
  connect: (token) => {
    if (socket && socket.connected) {
      notifySocketReady(socket);
      return socket;
    }

    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Assign to global variable
    socket = newSocket;
    notifySocketReady(newSocket);

    // Use newSocket in callbacks to avoid race conditions
    newSocket.on("connect", () => {
      notifySocketReady(newSocket);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    newSocket.on("disconnect", (reason) => {
      if (import.meta.env.MODE !== "production") {
        console.log("Socket disconnected:", reason);
      }
    });

    return newSocket;
  },

  // Disconnect from the socket server
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  // Get the socket instance
  getSocket: () => socket,

  onSocketReady: (callback) => {
    if (typeof window === "undefined") return () => {};

    const handleSocketReady = (event) => {
      callback(event.detail?.socket || socket);
    };

    window.addEventListener(SOCKET_READY_EVENT, handleSocketReady);

    if (socket) {
      callback(socket);
    }

    return () => {
      window.removeEventListener(SOCKET_READY_EVENT, handleSocketReady);
    };
  },

  // Join a conversation room
  joinConversation: (conversationId, type = "direct") => {
    if (socket && socket.connected) {
      socket.emit("conversation:join", { conversationId, type });
    }
  },

  // Leave a conversation room
  leaveConversation: (conversationId, type = "direct") => {
    if (socket && socket.connected) {
      socket.emit("conversation:leave", { conversationId, type });
    }
  },

  // Send a new message
  sendMessage: (
    conversationId,
    content,
    type = "direct",
    imageUrl = null,
    fileUrl = null,
    fileName = null,
    replyToId = null,
  ) => {
    if (socket && socket.connected) {
      socket.emit("message:new", {
        conversationId,
        content,
        type,
        imageUrl,
        fileUrl,
        fileName,
        replyToId,
      });
    } else {
      console.error("Cannot send message - socket not connected");
    }
  },

  // Send typing indicator
  sendTypingStart: (conversationId, type = "direct", userData = {}) => {
    if (socket && socket.connected) {
      socket.emit("typing:start", { conversationId, type, ...userData });
    }
  },

  // Stop typing indicator
  sendTypingStop: (conversationId, type = "direct") => {
    if (socket && socket.connected) {
      socket.emit("typing:stop", { conversationId, type });
    }
  },

  // Mark messages as read
  markMessagesAsRead: (conversationId, type = "direct") => {
    if (socket && socket.connected) {
      socket.emit("message:read", { conversationId, type });
    }
  },
};

export default socketService;
