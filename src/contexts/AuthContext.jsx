import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import api from "../services/api";
import socketService from "../services/socketService";
import { userService } from "../services/userService";
import { setUserTimezone } from "../utils/dateHelpers";

const AuthContext = createContext(null);

const normalizeHiddenBadgeIds = (source = {}) => {
  if (Array.isArray(source.hiddenBadgeIds)) return source.hiddenBadgeIds;
  return [];
};

const normalizeHiddenAwardIds = (source = {}) => {
  if (Array.isArray(source.hiddenAwardIds)) return source.hiddenAwardIds;
  return [];
};

const normalizeAuthUser = (userData, { defaultIsPublic = false } = {}) => ({
  ...userData,
  isPublic:
    userData?.isPublic !== undefined ? userData.isPublic : defaultIsPublic,
  hideBadges: userData?.hideBadges !== undefined ? userData.hideBadges : false,
  hiddenBadgeIds: normalizeHiddenBadgeIds(userData),
  hiddenAwardIds: normalizeHiddenAwardIds(userData),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Browser storage note: Lomir currently keeps the JWT in localStorage.token
  // for signed-in sessions. TODO: evaluate moving auth to httpOnly cookies.
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Ids of users in a block relationship with the current user (either
  // direction), used to mutually anonymize blocked users across the app.
  const [blockedRelationshipIds, setBlockedRelationshipIds] = useState(
    () => new Set(),
  );

  const userId = user?.id ?? null;

  // Refresh the block-relationship set from the backend. Exposed so screens
  // that change the blocklist (Settings, profile Block action) can keep the
  // app-wide set in sync.
  const refreshBlocks = useCallback(async () => {
    if (!userId) {
      setBlockedRelationshipIds(new Set());
      return;
    }
    try {
      const response = await userService.getBlockRelationships(userId);
      const ids = Array.isArray(response?.data?.ids) ? response.data.ids : [];
      setBlockedRelationshipIds(new Set(ids.map((id) => String(id))));
    } catch (err) {
      console.error("Failed to load block relationships:", err);
    }
  }, [userId]);

  useEffect(() => {
    refreshBlocks();
  }, [refreshBlocks]);

  // Refresh the block set in realtime when the server signals a block/unblock
  // (from either party), so hiding/restoring takes effect without a reload.
  useEffect(() => {
    if (!userId) return undefined;
    let activeSocket = null;
    const handleBlocksUpdated = () => {
      refreshBlocks();
    };
    const unsubscribe = socketService.onSocketReady((socketInstance) => {
      if (!socketInstance) return;
      activeSocket = socketInstance;
      socketInstance.off("blocks:updated", handleBlocksUpdated);
      socketInstance.on("blocks:updated", handleBlocksUpdated);
    });
    return () => {
      unsubscribe?.();
      if (activeSocket) activeSocket.off("blocks:updated", handleBlocksUpdated);
    };
  }, [userId, refreshBlocks]);

  // Load user data if token exists
  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      if (token) {
        try {
          const response = await api.get("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (cancelled) return;

          const userData = response.data.data.user;
          const enhancedUserData = normalizeAuthUser(userData);
          setUser(enhancedUserData);
          setUserTimezone(enhancedUserData);
          setError(null);

          // Connect socket AFTER user is loaded
          try {
            socketService.connect(token);
          } catch (socketError) {
            console.error("Failed to connect socket on load:", socketError);
          }
        } catch (err) {
          if (cancelled) return;
          console.error("Failed to load user:", err);
          // If token is invalid, clear it
          if (
            err.response &&
            (err.response.status === 401 || err.response.status === 403)
          ) {
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
          }
          setError("Authentication failed. Please login again.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else {
        if (!cancelled) setLoading(false);
      }
    };

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Register a new user
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await api.post("/api/auth/register", userData);

      // Check if email verification is required
      if (response.data.data?.requiresVerification) {
        // Don't log in - return success with verification flag
        return {
          success: true,
          requiresVerification: true,
          message: response.data.message,
        };
      }

      // If no verification required (shouldn't happen with new flow, but just in case)
      const { token, user } = response.data.data;

      const enhancedUser = normalizeAuthUser(user);

      localStorage.setItem("token", token);
      setToken(token);
      setUser(enhancedUser);
      setUserTimezone(enhancedUser);
      setError(null);

      try {
        socketService.connect(token);
      } catch (socketError) {
        console.error(
          "Failed to connect socket after registration:",
          socketError,
        );
      }

      return { success: true };
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
      return {
        success: false,
        message: err.response?.data?.message || "Registration failed",
        errors: err.response?.data?.errors,
      };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await api.post("/api/auth/login", credentials, {
        skipAuthRedirect: true,
      });
      const { token, user } = response.data.data;

      const enhancedUser = normalizeAuthUser(user);

      localStorage.setItem("token", token);
      setToken(token);
      setUser(enhancedUser);
      setUserTimezone(enhancedUser);
      setError(null);

      // Initialize socket connection AFTER user is set
      try {
        socketService.connect(token);
      } catch (socketError) {
        console.error("Failed to connect socket after login:", socketError);
        // Don't fail login if socket fails
      }

      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
      return {
        success: false,
        message: err.response?.data?.message || "Login failed",
      };
    } finally {
      setLoading(false);
    }
  };

  // Update user data
  const updateUser = (userData) => {
    setUser((prevUser) => {
      const definedUpdates = Object.fromEntries(
        Object.entries(userData || {}).filter(([, value]) => value !== undefined),
      );
      const newUser = normalizeAuthUser({ ...(prevUser || {}), ...definedUpdates });

      setUserTimezone(newUser);
      return newUser;
    });
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setUserTimezone(null);
    setBlockedRelationshipIds(new Set());
    setError(null); // Clear error when logging out
    // Disconnect socket
    socketService.disconnect();
  };

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Provide the authentication context
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        register,
        login,
        logout,
        updateUser,
        blockedRelationshipIds,
        refreshBlocks,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
