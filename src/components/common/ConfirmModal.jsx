import React from "react";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  loading = false,
  confirmLabel = "Confirm",
  loadingLabel,
  confirmVariant = "primary",
  confirmIcon = null,
  cancelLabel = "Cancel",
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    position="center"
    size="small"
    bodyClassName="p-4"
    closeOnBackdrop={!loading}
    closeOnEscape={!loading}
    showCloseButton={!loading}
    footer={
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={loading}
          icon={
            loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : confirmIcon
          }
        >
          {loading ? (loadingLabel ?? `${confirmLabel}...`) : confirmLabel}
        </Button>
      </div>
    }
  >
    {children}
  </Modal>
);

export default ConfirmModal;
