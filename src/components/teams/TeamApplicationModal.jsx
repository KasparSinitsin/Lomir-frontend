import React, { useState } from "react";
import { Send, Save, MessageCircle } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";

const TeamApplicationModal = ({
  isOpen,
  onClose,
  team,
  onSubmit,
  loading = false,
}) => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isDraft, setIsDraft] = useState(false);

  const handleSubmit = async (saveAsDraft = false) => {
    if (!message.trim() && !saveAsDraft) {
      setError("Please write a message to the team creator");
      return;
    }

    try {
      setError(null);
      await onSubmit({
        message: message.trim(),
        isDraft: saveAsDraft,
      });

      if (saveAsDraft) {
        setSuccess("Draft saved successfully");
        setIsDraft(true);
      } else {
        setSuccess("Application sent successfully!");
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Failed to process application");
    }
  };

  const handleClose = () => {
    setMessage("");
    setError(null);
    setSuccess(null);
    setIsDraft(false);
    onClose();
  };

  // Custom header preserving original complex structure
  const customHeader = (
    <div>
      <h2 className="text-lg font-medium text-primary mb-1">
        Apply to join the Team
      </h2>
      <h3 className="text-xl font-bold text-primary">"{team?.name}"</h3>
    </div>
  );

  // Footer with action buttons
  const footer = (
    <div className="flex justify-end space-x-3">
      <Button
        variant="ghost"
        onClick={handleClose}
        disabled={loading}
        size="sm"
      >
        Cancel
      </Button>

      <Button
        variant="secondary"
        onClick={() => handleSubmit(true)}
        disabled={loading || !message.trim()}
        size="sm"
        icon={<Save size={16} />}
      >
        Save Draft
      </Button>

      <Button
        variant="primary"
        onClick={() => handleSubmit(false)}
        disabled={loading || !message.trim()}
        size="sm"
        icon={<Send size={16} />}
      >
        {loading ? "Sending..." : "Send Application"}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={customHeader}
      footer={footer}
      
      // PRESERVE ORIGINAL POSITIONING: Right side, not center!
      position="right"
      zIndex="z-[60]"
      size="sm"
      
      // PRESERVE ORIGINAL STYLING
      modalClassName="border border-base-300"
      maxHeight="max-h-[80vh]"
      minHeight="min-h-[400px]"
      
      // No backdrop since it's positioned on the right
      hideBackdrop={true}
      closeOnBackdrop={false}
    >
      {/* Content - Just the main content, all layout handled by Modal! */}
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
          className="mb-4"
        />
      )}

      {success && (
        <Alert
          type="success"
          message={success}
          onClose={() => setSuccess(null)}
          className="mb-4"
        />
      )}

      <div className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              Your message to the team creator:
            </span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="textarea textarea-bordered h-32 w-full resize-none"
            placeholder="Tell the team creator why you'd like to join this team, what skills you bring, and what you hope to contribute..."
            disabled={loading}
            maxLength={500}
          />
          <div className="label">
            <span className="label-text-alt text-base-content/60">
              {message.length}/500 characters
            </span>
          </div>
        </div>

        {/* Team info for context */}
        {team?.description && (
          <div className="bg-base-200/50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <MessageCircle size={16} className="text-primary" />
              <span className="text-sm font-medium">Team Info</span>
            </div>
            <p className="text-sm text-base-content/80">
              {team.description.length > 100 
                ? `${team.description.substring(0, 100)}...` 
                : team.description
              }
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TeamApplicationModal;