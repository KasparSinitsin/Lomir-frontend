import React, { useState } from "react";
import { Clock, MessageCircle } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { format } from "date-fns";

const TeamApplicationDetailsModal = ({
  isOpen,
  application,
  onClose,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Debug: Log the application object to see its structure
  React.useEffect(() => {
    if (application) {
      console.log("TeamApplicationDetailsModal - Application object:", application);
      console.log("Available date properties:", {
        created_at: application.created_at,
        createdAt: application.createdAt,
        date: application.date,
      });
    }
  }, [application]);

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

  // Format application date - check multiple possible property names
  const getApplicationDate = () => {
    const date = application?.created_at || application?.createdAt || application?.date;
    
    if (!date) return "Unknown date";
    
    try {
      return format(new Date(date), "MMMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error, "Date value:", date);
      return "Unknown date";
    }
  };
  
  const formattedDate = getApplicationDate();

  // Footer with action buttons
  const footer = (
    <div className="flex justify-end space-x-3">
      <Button variant="ghost" onClick={onClose}>
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
  );

  return (
    <Modal
      isOpen={isOpen && !!application}
      onClose={onClose}
      title="Pending Application"
      footer={footer}
      
      // Modal settings
      position="center"
      size="default" // max-w-2xl
      maxHeight="max-h-[90vh]"
      
      // Standard center modal behavior
      closeOnBackdrop={true}
      closeOnEscape={true}
      showCloseButton={true}
    >
      {/* Team Information */}
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">{application?.team?.name}</h3>
        <p className="text-base-content/70 mb-4">
          {application?.team?.description}
        </p>

        {/* Application Date Badge */}
        <div className="flex items-center text-sm text-base-content/70 bg-yellow-100 py-2 px-3 rounded-lg mb-4">
          <Clock size={18} className="mr-2 text-yellow-600" />
          <span>Application submitted on {formattedDate}</span>
        </div>
      </div>

      {/* Application Message */}
      <div className="bg-base-200/50 rounded-lg p-4">
        <div className="flex items-start mb-2">
          <MessageCircle
            size={20}
            className="text-primary mt-1 mr-2 flex-shrink-0"
          />
          <h4 className="font-medium">Your Application Message</h4>
        </div>
        <p className="text-base-content/90 pl-7">{application?.message}</p>
      </div>
    </Modal>
  );
};

export default TeamApplicationDetailsModal;