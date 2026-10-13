import { io } from "socket.io-client";

let socket = null;
const SOCKET_READY_EVENT = "lomir:socket-ready";
const SOCKET_RECONNECTED_EVENT = "lomir:socket-reconnected";

const notifySocketReady = (socketInstance) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SOCKET_READY_EVENT, { detail: { socket: socketInstance } }),
  );
};

const socketService = {
  // Connect to the socket server
  connect: () => {
    if (socket && socket.connected) {
      notifySocketReady(socket);
      return socket;
    }

    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    // In production connect same-origin (undefined → the page origin), so the
    // Socket.IO traffic is proxied through the Vercel rewrite and the handshake
    // cookie stays first-party. Note: Vercel (Hobby) does not proxy the
    // WebSocket upgrade, so Socket.IO runs over HTTP long-polling there; a
    // future shared-domain setup restores the native WebSocket transport.
    // Locally, connect to the backend dev server directly.
    const SOCKET_URL = import.meta.env.PROD
      ? undefined
      : import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

    // The backend authenticates the handshake from the httpOnly session
    // cookie; withCredentials makes the browser send it with the connection.
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["polling", "websocket"],
      // No attempt limit: after a limited number the client gave up for good
      // (about 17 s of backend downtime was enough), and the page stayed deaf
      // to every message and event until it was reloaded, without any sign.
      reconnection: true,
      reconnectionDelay: 1000,
    });

    // Assign to global variable
    socket = newSocket;
    notifySocketReady(newSocket);

    // Use newSocket in callbacks to avoid race conditions
    let hasConnectedBefore = false;
    newSocket.on("connect", () => {
      notifySocketReady(newSocket);
      // Announced after the ready event, so listeners are attached again first.
      if (hasConnectedBefore && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SOCKET_RECONNECTED_EVENT));
      }
      hasConnectedBefore = true;
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

  // Fires on every connect of a socket after its first. Whatever the server
  // emitted in between was lost, so this is the moment to catch up.
  onSocketReconnected: (callback) => {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(SOCKET_RECONNECTED_EVENT, callback);
    return () => {
      window.removeEventListener(SOCKET_RECONNECTED_EVENT, callback);
    };
  },

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
