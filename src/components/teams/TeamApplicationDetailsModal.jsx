import React, { useState } from "react";
import { X, Clock, MessageCircle } from "lucide-react";
import Button from "../common/Button";
import { format } from "date-fns";

const TeamApplicationDetailsModal = ({
  isOpen,
  application,
  onClose,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !application) return null;

  const handleCancelApplication = async () => {
    if (
      window.confirm(
        "Are you sure you want to cancel your application to this team?"
      )
    ) {
      setIsLoading(true);
      try {
        await onCancel(application.id);
        onClose();
      } catch (error) {
        console.error("Error canceling application:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Format application date
  const formattedDate = application.created_at
    ? format(new Date(application.created_at), "MMMM d, yyyy")
    : "Unknown date";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden bg-base-100 shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-xl font-medium text-primary">
            Pending Application
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto">
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-2">{application.team.name}</h3>
            <p className="text-base-content/70 mb-4">
              {application.team.description}
            </p>

            <div className="flex items-center text-sm text-base-content/70 bg-yellow-100 py-2 px-3 rounded-lg mb-4">
              <Clock size={18} className="mr-2 text-yellow-600" />
              <span>Application submitted on {formattedDate}</span>
            </div>
          </div>

          <div className="bg-base-200/50 rounded-lg p-4 mb-6">
            <div className="flex items-start mb-2">
              <MessageCircle
                size={20}
                className="text-primary mt-1 mr-2 flex-shrink-0"
              />
              <h4 className="font-medium">Your Application Message</h4>
            </div>
            <p className="text-base-content/90 pl-7">{application.message}</p>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose} className="mr-2">
              Close
            </Button>
            <Button
              variant="error"
              onClick={handleCancelApplication}
              disabled={isLoading}
            >
              {isLoading ? "Canceling..." : "Cancel Application"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamApplicationDetailsModal;
