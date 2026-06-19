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
  // Auth is carried by an httpOnly session cookie set by the backend and is
  // intentionally not readable by JavaScript. Auth state is derived by calling
  // /api/auth/me; the cookie is sent automatically (api uses withCredentials).
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

  // On mount, restore the session from the httpOnly cookie (if present) by
  // asking the backend who we are. skipAuthRedirect keeps a logged-out
  // visitor's 401 from bouncing them to /login.
  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        const response = await api.get("/api/auth/me", {
          skipAuthRedirect: true,
          skipErrorLog: true,
        });

        if (cancelled) return;

        const userData = response.data.data.user;
        const enhancedUserData = normalizeAuthUser(userData);
        setUser(enhancedUserData);
        setUserTimezone(enhancedUserData);
        setError(null);

        // Connect socket AFTER user is loaded
        try {
          socketService.connect();
        } catch (socketError) {
          console.error("Failed to connect socket on load:", socketError);
        }
      } catch (err) {
        if (cancelled) return;
        // A 401/403 simply means "not logged in" — not an error to surface.
        const status = err.response?.status;
        if (status !== 401 && status !== 403) {
          console.error("Failed to restore session:", err);
        }
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

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

      // If no verification required (shouldn't happen with new flow, but just
      // in case). The session cookie is set by the backend on this response.
      const { user } = response.data.data;

      const enhancedUser = normalizeAuthUser(user);

      setUser(enhancedUser);
      setUserTimezone(enhancedUser);
      setError(null);

      try {
        socketService.connect();
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
      // The session cookie is set by the backend on this response.
      const { user } = response.data.data;

      const enhancedUser = normalizeAuthUser(user);

      setUser(enhancedUser);
      setUserTimezone(enhancedUser);
      setError(null);

      // Initialize socket connection AFTER user is set
      try {
        socketService.connect();
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
  const logout = async () => {
    // Clear client state immediately so the UI reflects logout without delay.
    setUser(null);
    setUserTimezone(null);
    setBlockedRelationshipIds(new Set());
    setError(null); // Clear error when logging out
    // Disconnect socket
    socketService.disconnect();

    // Ask the backend to clear the httpOnly session cookie. Send an empty
    // object (not null) so the JSON body parser receives a valid payload.
    try {
      await api.post("/api/auth/logout", {}, { skipAuthRedirect: true });
    } catch (err) {
      console.error("Logout request failed:", err);
    }
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
