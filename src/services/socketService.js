import { io } from "socket.io-client";

let socket = null;

// Remove /api from the URL for socket connection
const getSocketURL = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
  // Remove /api suffix if it exists
  return apiUrl.replace(/\/api$/, "");
};

const SOCKET_URL = getSocketURL();

export const socketService = {
  // Initialize socket connection
  connect: (token) => {
    if (socket) {
      socket.disconnect();
    }

    console.log("Attempting to connect to socket at:", SOCKET_URL);

    // Create new socket connection with auth token
    socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket", "polling"],
      forceNew: true, // Force a new connection
    });

    // Set up basic event handlers
    socket.on("connect", () => {
      console.log("Socket connected successfully", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      console.error("Error details:", {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
      });
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
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
      console.log("Socket disconnected manually");
    }
  },

  // Join a conversation room
  joinConversation: (conversationId) => {
    if (socket && socket.connected) {
      socket.emit("conversation:join", conversationId);
      console.log("Joined conversation:", conversationId);
    } else {
      console.warn("Cannot join conversation - socket not connected");
    }
  },

  // Leave a conversation room
  leaveConversation: (conversationId) => {
    if (socket && socket.connected) {
      socket.emit("conversation:leave", conversationId);
      console.log("Left conversation:", conversationId);
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
  markMessagesAsRead: (conversationId) => {
    if (socket && socket.connected) {
      socket.emit("message:read", { conversationId });
    }
  },
};

export default socketService;
