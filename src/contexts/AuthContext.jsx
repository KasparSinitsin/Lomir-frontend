import { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";
import socketService from "../services/socketService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user data if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Connect socket with token
          socketService.connect(token);
          console.log("Loading user with token:", token);
          const response = await api.get("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          // Ensure we have both snake_case and camelCase versions of properties
          const userData = response.data.data.user;
          const enhancedUserData = {
            ...userData,
            // Add camelCase versions if missing
            firstName: userData.first_name || userData.firstName,
            lastName: userData.last_name || userData.lastName,
            postalCode: userData.postal_code || userData.postalCode,
            avatarUrl: userData.avatar_url || userData.avatarUrl,
            isPublic:
              userData.is_public !== undefined
                ? userData.is_public
                : userData.isPublic !== undefined
                ? userData.isPublic
                : true,
            // Add snake_case versions if missing
            first_name: userData.first_name || userData.firstName,
            last_name: userData.last_name || userData.lastName,
            postal_code: userData.postal_code || userData.postalCode,
            avatar_url: userData.avatar_url || userData.avatarUrl,
            is_public:
              userData.is_public !== undefined
                ? userData.is_public
                : userData.isPublic !== undefined
                ? userData.isPublic
                : true,
          };

          console.log("Enhanced user data:", enhancedUserData);
          setUser(enhancedUserData);
          setError(null);
        } catch (err) {
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
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Register a new user
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await api.post("/api/auth/register", userData);
      const { token, user } = response.data.data;

      // Enhance user data with both snake_case and camelCase
      const enhancedUser = {
        ...user,
        // Add camelCase versions
        firstName: user.first_name || user.firstName,
        lastName: user.last_name || user.lastName,
        postalCode: user.postal_code || user.postalCode,
        avatarUrl: user.avatar_url || user.avatarUrl,
        isPublic:
          user.is_public !== undefined
            ? user.is_public
            : user.isPublic !== undefined
            ? user.isPublic
            : false,
        // Add snake_case versions
        first_name: user.first_name || user.firstName,
        last_name: user.last_name || user.lastName,
        postal_code: user.postal_code || user.postalCode,
        avatar_url: user.avatar_url || user.avatarUrl,
        is_public:
          user.is_public !== undefined
            ? user.is_public
            : user.isPublic !== undefined
            ? user.isPublic
            : false,
      };

      localStorage.setItem("token", token);
      setToken(token);
      setUser(enhancedUser);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
      return {
        success: false,
        message: err.response?.data?.message || "Registration failed",
      };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await api.post("/api/auth/login", credentials);
      const { token, user } = response.data.data;

      // Initialize socket connection with token
      socketService.connect(token);

      // Enhance user data with both snake_case and camelCase
      const enhancedUser = {
        ...user,
        // Add camelCase versions
        firstName: user.first_name || user.firstName,
        lastName: user.last_name || user.lastName,
        postalCode: user.postal_code || user.postalCode,
        avatarUrl: user.avatar_url || user.avatarUrl,
        isPublic:
          user.is_public !== undefined
            ? user.is_public
            : user.isPublic !== undefined
            ? user.isPublic
            : false,
        // Add snake_case versions
        first_name: user.first_name || user.firstName,
        last_name: user.last_name || user.lastName,
        postal_code: user.postal_code || user.postalCode,
        avatar_url: user.avatar_url || user.avatarUrl,
        is_public:
          user.is_public !== undefined
            ? user.is_public
            : user.isPublic !== undefined
            ? user.isPublic
            : false,
      };

      localStorage.setItem("token", token);
      setToken(token);
      setUser(enhancedUser);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials."
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
    console.log("Updating user in context with:", userData);

    // Create a new object that preserves existing properties and adds new ones
    setUser((prevUser) => {
      if (!prevUser) return userData;

      // Start with a copy of the previous user data
      const newUser = { ...prevUser };

      // Add all new properties
      Object.keys(userData).forEach((key) => {
        if (userData[key] !== undefined) {
          newUser[key] = userData[key];
        }
      });

      // Specifically handle visibility properties to ensure both versions exist
      if (userData.is_public !== undefined) {
        newUser.is_public = userData.is_public;
        newUser.isPublic = userData.is_public;
      } else if (userData.isPublic !== undefined) {
        newUser.isPublic = userData.isPublic;
        newUser.is_public = userData.isPublic;
      }

      // Ensure we don't override with undefined values
      if (newUser.is_public === undefined && newUser.isPublic === undefined) {
        // Keep the existing values if both are undefined
        newUser.is_public = prevUser.is_public;
        newUser.isPublic = prevUser.isPublic;
      }

      // Handle other property pairs to ensure both snake_case and camelCase exist
      if (userData.first_name !== undefined) {
        newUser.first_name = userData.first_name;
        newUser.firstName = userData.first_name;
      } else if (userData.firstName !== undefined) {
        newUser.firstName = userData.firstName;
        newUser.first_name = userData.firstName;
      }

      if (userData.last_name !== undefined) {
        newUser.last_name = userData.last_name;
        newUser.lastName = userData.last_name;
      } else if (userData.lastName !== undefined) {
        newUser.lastName = userData.lastName;
        newUser.last_name = userData.lastName;
      }

      if (userData.postal_code !== undefined) {
        newUser.postal_code = userData.postal_code;
        newUser.postalCode = userData.postal_code;
      } else if (userData.postalCode !== undefined) {
        newUser.postalCode = userData.postalCode;
        newUser.postal_code = userData.postalCode;
      }

      if (userData.avatar_url !== undefined) {
        newUser.avatar_url = userData.avatar_url;
        newUser.avatarUrl = userData.avatar_url;
      } else if (userData.avatarUrl !== undefined) {
        newUser.avatarUrl = userData.avatarUrl;
        newUser.avatar_url = userData.avatarUrl;
      }

      console.log("Updated user object:", newUser);
      return newUser;
    });
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
