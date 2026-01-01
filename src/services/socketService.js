import { io } from "socket.io-client";

let socket = null;

const socketService = {
  // Connect to the socket server
  connect: (token) => {
    if (socket && socket.connected) {
      console.log("Socket already connected");
      return socket;
    }

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    return socket;
  },

  // Disconnect from the socket server
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      console.log("Socket disconnected manually");
    }
  },

  // Get the socket instance
  getSocket: () => socket,

  // Join a conversation room
  joinConversation: (conversationId, type = "direct") => {
    if (socket && socket.connected) {
      socket.emit("conversation:join", { conversationId, type });
      console.log(`Joined ${type} conversation:`, conversationId);
    }
  },

  // Leave a conversation room
  leaveConversation: (conversationId, type = "direct") => {
    if (socket && socket.connected) {
      socket.emit("conversation:leave", { conversationId, type });
      console.log(`Left ${type} conversation:`, conversationId);
    }
  },

  // Send a new message
  sendMessage: (conversationId, content, type = "direct") => {
    if (socket && socket.connected) {
      socket.emit("message:new", { conversationId, content, type });
      console.log("Sending message:", { conversationId, content, type });
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
      console.log(`Marking ${type} messages as read for:`, conversationId);
    }
  },
};

export default socketService;
