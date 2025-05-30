import React, { useState } from "react";
import { X, Send, Save, MessageCircle } from "lucide-react";
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
        isDraft: saveAsDraft, // This should be false when sending
      });

      if (saveAsDraft) {
        setSuccess("Draft saved successfully");
        setIsDraft(true);
      } else {
        setSuccess("Application sent successfully!");
        // Close modal after a brief delay
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

  if (!isOpen) return null;

  return (
    <div className="fixed top-1/2 right-8 transform -translate-y-1/2 z-[60] w-full max-w-md">
      <div className="bg-base-100 shadow-xl rounded-xl overflow-hidden border border-base-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-base-300 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-primary mb-1">
              Apply to join the Team
            </h2>
            <h3 className="text-xl font-bold text-primary">"{team?.name}"</h3>
          </div>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-6">
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
              />
              <div className="label">
                <span className="label-text-alt text-base-content/60">
                  {message.length}/500 characters
                </span>
              </div>
            </div>

            {/* Show team info briefly for context
            <div className="bg-base-200/50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <MessageCircle size={16} className="text-primary" />
                <span className="text-sm font-medium">Team Info</span>
              </div>
              <p className="text-sm text-base-content/80">
                {team?.description?.substring(0, 100)}
                {team?.description?.length > 100 ? '...' : ''}
              </p>
            </div> */}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-base-300 flex justify-end space-x-3">
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
      </div>
    </div>
  );
};

export default TeamApplicationModal;
