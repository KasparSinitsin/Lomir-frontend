import React from "react";
import { User, X, Mail } from "lucide-react";
import Modal from "./Modal";
import ScreenAlert from "./ScreenAlert";
import Button from "./Button";

/**
 * RequestListModal Component
 *
 * A reusable modal wrapper for displaying lists of requests
 * (applications, invitations, etc.)
 *
 * Used by: TeamApplicationsModal, TeamInvitesModal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {string} props.title - Main title text
 * @param {string} props.subtitle - Subtitle with context (e.g., team name)
 * @param {number} props.itemCount - Number of items in the list
 * @param {string} props.itemName - Singular name for items (e.g., "application", "invitation")
 * @param {string} props.footerText - Optional footer help text
 * @param {string} props.error - Error message to display
 * @param {Function} props.onErrorClose - Callback to clear error
 * @param {string} props.success - Success message to display
 * @param {Function} props.onSuccessClose - Callback to clear success
 * @param {React.ReactNode} props.emptyIcon - Icon for empty state (default: User)
 * @param {string} props.emptyTitle - Title for empty state
 * @param {string} props.emptyMessage - Message for empty state
 * @param {React.ReactNode} props.children - List content to render
 * @param {React.ReactNode} props.extraModals - Additional modals to render (e.g., UserDetailsModal)
 */
const RequestListModal = ({
  // Modal control
  isOpen,
  onClose,

  // Header
  title,
  subtitle,
  itemCount = 0,
  itemName = "item",

  // Footer
  footerText,

  // Alerts
  error,
  onErrorClose,
  success,
  onSuccessClose,

  // Empty state
  emptyIcon,
  emptyTitle,
  emptyMessage,

  // Header byline icon (defaults to pink Mail)
  bylineIcon,

  // Content
  children,

  // Extra modals (rendered outside main modal)
  extraModals,
}) => {
  // ============ Computed Values ============

  // Pluralize item name
  const pluralItemName = itemCount === 1 ? itemName : `${itemName}s`;

  // Custom header with count
  const customHeader = (
    <div>
      <h2 className="text-xl font-medium text-primary leading-[110%] mb-[0.2em]">
        {typeof title === "string" && subtitle ? `${title} ${subtitle}` : title}
      </h2>
      <p className="text-sm text-base-content/70 mt-1 flex items-center gap-1.5">
        {bylineIcon ?? <Mail size={14} className="text-pink-500 shrink-0" />}
        {itemCount} pending {pluralItemName}
      </p>
    </div>
  );

  // Footer with summary
  const footer =
    itemCount > 0 ? (
      <div className="flex flex-wrap justify-between items-center gap-y-1 text-sm text-base-content/70">
        <span className="leading-[1.2]">{footerText}</span>
        <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={16} />} className="ml-auto w-full sm:w-auto">
          Close
        </Button>
      </div>
    ) : null;

  // Default empty state icon
  const EmptyIcon = emptyIcon || User;

  // ============ Render ============

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={customHeader}
        footer={footer}
        position="center"
        size="lg"
        maxHeight="max-h-[90vh]"
        minHeight="min-h-[300px]"
        closeOnBackdrop={true}
        closeOnEscape={true}
        showCloseButton={true}
      >
        {/* Content: Empty State or List */}
        {itemCount === 0 ? (
          <div className="text-center py-12">
            <EmptyIcon
              size={48}
              className="mx-auto text-base-content/30 mb-4"
            />
            <h3 className="text-lg font-medium text-base-content/70 mb-2">
              {emptyTitle || `No pending ${pluralItemName}`}
            </h3>
            <p className="text-base-content/50">
              {emptyMessage || `${pluralItemName} will appear here.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">{children}</div>
        )}
      </Modal>

      <ScreenAlert
        alerts={[
          error && {
            type: "error",
            message: error,
            onClose: onErrorClose,
          },
          success && {
            type: "success",
            message: success,
            onClose: onSuccessClose,
          },
        ]}
      />

      {/* Extra modals (e.g., UserDetailsModal) rendered outside */}
      {extraModals}
    </>
  );
};

export default RequestListModal;
