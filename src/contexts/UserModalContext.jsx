import React, { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import UserDetailsModal from "../components/users/UserDetailsModal";
import { ModalLayerProvider, MODAL_Z_STEP } from "./ModalLayerContext";

/**
 * UserModalContext
 *
 * Provides a global mechanism to open UserDetailsModal from anywhere in the app.
 * Manages a stack of modals with deterministic z-indexing to support infinite
 * chaining (e.g., awarder → awarder → awarder).
 *
 * Integrates with ModalLayerContext to ensure child modals (BadgeCategoryModal,
 * TeamInviteModal, etc.) opened from within a UserDetailsModal stack correctly.
 *
 * Usage:
 *   const { openUserModal } = useUserModal();
 *   openUserModal(userId);
 *
 * Z-Index Layering Policy:
 *   Base z-index: 1100 (above BadgeCategoryModal at 1000)
 *   Each stacked modal: +100 (1100, 1200, 1300, ...)
 *   Child modals within each: +100 from their parent
 */

const UserModalContext = createContext(null);

// Base z-index for global user modals (above BadgeCategoryModal at z-1000)
const BASE_Z_INDEX = 1100;

export const UserModalProvider = ({ children }) => {
  // Stack of user IDs currently open
  const [modalStack, setModalStack] = useState([]);

  /**
   * Open a user modal for the given userId.
   * If already in stack, don't add duplicate.
   */
  const openUserModal = useCallback((userId, extraProps = {}) => {
    if (!userId) return;

    const normalizedId = String(userId);

    setModalStack((prev) => {
      // Prevent duplicate at top of stack
      if (prev.length > 0 && String(prev[prev.length - 1].userId) === normalizedId) {
        return prev;
      }
      // Prevent duplicate anywhere in stack
      if (prev.some((item) => String(item.userId) === normalizedId)) {
        return prev;
      }
      return [...prev, { userId: normalizedId, ...extraProps }];
    });
  }, []);

  /**
   * Close the topmost modal (LIFO behavior).
   */
  const closeTopModal = useCallback(() => {
    setModalStack((prev) => prev.slice(0, -1));
  }, []);

  /**
   * Close a specific modal by userId.
   * Also closes all modals above it in the stack.
   */
  const closeModal = useCallback((userId) => {
    if (!userId) return;

    const normalizedId = String(userId);

    setModalStack((prev) => {
      const index = prev.findIndex((item) => String(item.userId) === normalizedId);
      if (index === -1) return prev;
      // Close this modal and all above it
      return prev.slice(0, index);
    });
  }, []);

  /**
   * Close all modals.
   */
  const closeAllModals = useCallback(() => {
    setModalStack([]);
  }, []);

  /**
   * Check if any modal is currently open.
   */
  const hasOpenModals = modalStack.length > 0;

  const contextValue = {
    openUserModal,
    closeTopModal,
    closeModal,
    closeAllModals,
    hasOpenModals,
    modalStack,
  };

  return (
    <UserModalContext.Provider value={contextValue}>
      {children}

      {/* Render modal stack via portal */}
      {modalStack.length > 0 &&
        createPortal(
          <UserModalStack
            stack={modalStack}
            onClose={closeTopModal}
            onOpenUser={openUserModal}
          />,
          document.body,
        )}
    </UserModalContext.Provider>
  );
};

/**
 * Renders the stack of UserDetailsModals with proper z-indexing.
 * Each modal is wrapped in ModalLayerProvider so child modals stack correctly.
 */
const UserModalStack = ({ stack, onClose, onOpenUser }) => {
  return (
    <>
      {stack.map(({ userId, roleMatchTagIds, roleMatchBadgeNames }, idx) => {
        const zIndex = BASE_Z_INDEX + idx * MODAL_Z_STEP;
        const isTop = idx === stack.length - 1;

        return (
          <ModalLayerProvider
            key={`global-user-modal-layer-${userId}-${idx}`}
            zIndex={zIndex + MODAL_Z_STEP} // Child modals get this z-index
          >
            <UserDetailsModal
              isOpen={true}
              userId={userId}
              onClose={() => {
                // Only allow closing the topmost modal
                if (isTop) {
                  onClose();
                }
              }}
              mode="profile"
              onOpenUser={onOpenUser}
              // Pass the z-index for this modal
              zIndexStyle={{ zIndex }}
              boxZIndexStyle={{ zIndex: zIndex + 1 }}
              roleMatchTagIds={roleMatchTagIds}
              roleMatchBadgeNames={roleMatchBadgeNames}
            />
          </ModalLayerProvider>
        );
      })}
    </>
  );
};

/**
 * Hook to access the UserModalContext.
 *
 * @returns {Object} Context value with openUserModal, closeTopModal, etc.
 * @throws {Error} If used outside of UserModalProvider
 */
export const useUserModal = () => {
  const context = useContext(UserModalContext);

  if (!context) {
    throw new Error("useUserModal must be used within a UserModalProvider");
  }

  return context;
};

/**
 * Optional hook that returns null if context is not available.
 * Useful for components that may be used both inside and outside the provider.
 */
export const useUserModalSafe = () => {
  return useContext(UserModalContext);
};

export default UserModalContext;
