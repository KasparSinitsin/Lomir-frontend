import React from "react";
import { useTranslation } from "react-i18next";
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
  // The two labels are resolved with t() in the body rather than defaulted
  // here: a default in the parameter list is evaluated at module scope and
  // freezes whichever language loaded first, so changeLanguage would never
  // move it. A caller that passes a label still wins.
  confirmLabel,
  loadingLabel,
  confirmVariant = "primary",
  confirmIcon = null,
  cancelLabel,
}) => {
  const { t } = useTranslation();
  const resolvedConfirmLabel = confirmLabel ?? t("confirmModal.confirm");
  const resolvedCancelLabel = cancelLabel ?? t("confirmModal.cancel");

  return (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    position="center"
    size="small"
    bodyClassName="p-6"
    closeOnBackdrop={!loading}
    closeOnEscape={!loading}
    showCloseButton={!loading}
    footer={
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {resolvedCancelLabel}
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
          {loading
            ? (loadingLabel ?? `${resolvedConfirmLabel}...`)
            : resolvedConfirmLabel}
        </Button>
      </div>
    }
  >
    {children}
  </Modal>
  );
};

export default ConfirmModal;
