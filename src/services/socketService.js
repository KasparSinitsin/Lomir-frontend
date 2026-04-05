import { io } from "socket.io-client";
let socket = null;

const socketService = {
  // Connect to the socket server
  connect: (token) => {
    if (socket && socket.connected) {
      return socket;
    }

    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "https://lomir-backend.shares.zrok.io"

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Assign to global variable
    socket = newSocket;

    // Use newSocket in callbacks to avoid race conditions
    newSocket.on("connect", () => {
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
  ) => {
    if (socket && socket.connected) {
      socket.emit("message:new", {
        conversationId,
        content,
        type,
        imageUrl,
        fileUrl,
        fileName,
      });
    } else {
      console.error("Cannot send message - socket not connected");
    }
  },

  // Send typing indicator
  sendTypingStart: (conversationId, type = "direct") => {
    if (socket && socket.connected) {
      socket.emit("typing:start", { conversationId, type });
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
