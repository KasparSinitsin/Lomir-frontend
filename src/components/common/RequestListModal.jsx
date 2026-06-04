import React from "react";
import { User, X, Mail } from "lucide-react";
import Modal from "./Modal";
import Alert from "./Alert";
import Button from "./Button";

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

  const pluralItemName = itemCount === 1 ? itemName : `${itemName}s`;

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

  const footer =
    itemCount > 0 ? (
      <div className="flex flex-wrap justify-between items-center gap-y-1 text-sm text-base-content/70">
        <span className="leading-[1.2]">{footerText}</span>
        <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={16} />} className="ml-auto w-full sm:w-auto">
          Close
        </Button>
      </div>
    ) : null;

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
        {/* Error shown inline — visible at the point of action */}
        {error && (
          <Alert type="error" message={error} onClose={onErrorClose} className="mb-4 w-full shadow-sm" />
        )}

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

      {/* Extra modals (e.g., UserDetailsModal) rendered outside */}
      {extraModals}
    </>
  );
};

export default RequestListModal;
