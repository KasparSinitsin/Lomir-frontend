import React, { createContext, useContext } from "react";

/**
 * ModalLayerContext
 *
 * Provides automatic z-index management for nested modals.
 * When a modal renders, it can wrap its children in a ModalLayerProvider
 * with a higher z-index, ensuring any child modals stack correctly.
 *
 * Usage:
 *   // In a parent modal component:
 *   const currentZ = useModalLayer();
 *   const childZ = currentZ + MODAL_Z_STEP;
 *
 *   return (
 *     <Modal zIndexStyle={{ zIndex: currentZ }}>
 *       <ModalLayerProvider zIndex={childZ}>
 *         {children that may open more modals}
 *       </ModalLayerProvider>
 *     </Modal>
 *   );
 *
 * Z-Index Layering Policy:
 *   - Default page level: 50
 *   - Each nested modal layer: +100
 *   - Within a layer, backdrop: z, box: z+1
 */

// Default z-index for modals at the root level
const DEFAULT_Z_INDEX = 50;

// Step between modal layers
export const MODAL_Z_STEP = 100;

const ModalLayerContext = createContext(DEFAULT_Z_INDEX);

/**
 * Provider that sets the z-index for the current modal layer.
 * Wrap modal content in this to establish a new layer for child modals.
 */
export const ModalLayerProvider = ({ children, zIndex }) => {
  return (
    <ModalLayerContext.Provider value={zIndex}>
      {children}
    </ModalLayerContext.Provider>
  );
};

/**
 * Hook to get the current modal layer's z-index.
 * Use this to determine the z-index for modals at the current level.
 *
 * @returns {number} The current z-index level
 */
export const useModalLayer = () => {
  return useContext(ModalLayerContext);
};

/**
 * Hook to get the z-index for a child modal.
 * Returns current layer + step, for modals opened from within the current modal.
 *
 * @param {number} offset - Additional offset (default: MODAL_Z_STEP)
 * @returns {number} The z-index for child modals
 */
export const useChildModalZIndex = (offset = MODAL_Z_STEP) => {
  const currentZ = useContext(ModalLayerContext);
  return currentZ + offset;
};

export default ModalLayerContext;
