import { io } from "socket.io-client";
import { messageService } from "./messageService";

let socket = null;

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const socketService = {
  // Initialize socket connection
  connect: (token) => {
    if (socket) {
      socket.disconnect();
    }

    // Create new socket connection with auth token
    socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    // Set up basic event handlers
    socket.on("connect", () => {
      console.log("Socket connected");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    return socket;
  },

  // Get the socket instance
  getSocket: () => {
    return socket;
  },

  // Disconnect socket
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  // Join a conversation room
  joinConversation: (conversationId) => {
    if (socket) {
      socket.emit("conversation:join", conversationId);
    }
  },

  // Leave a conversation room
  leaveConversation: (conversationId) => {
    if (socket) {
      socket.emit("conversation:leave", conversationId);
    }
  },

  // Send a new message
  sendMessage: (conversationId, content) => {
    if (socket) {
      socket.emit("message:new", { conversationId, content });
    }
  },

  // Send typing indicator
  sendTypingStart: (conversationId) => {
    if (socket) {
      socket.emit("typing:start", conversationId);
    }
  },

  // Stop typing indicator
  sendTypingStop: (conversationId) => {
    if (socket) {
      socket.emit("typing:stop", conversationId);
    }
  },

  // Mark messages as read
  markMessagesAsRead: (conversationId) => {
    if (socket) {
      socket.emit("message:read", { conversationId });
    }
  },
};

export default socketService;
