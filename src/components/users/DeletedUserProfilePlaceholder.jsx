import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../common/Card";
import Button from "../common/Button";
import UserAvatar from "./UserAvatar";

const DeletedUserProfilePlaceholder = ({
  onNavigateAway = null,
  title = "This user has left Lomir",
  subtitle = "Their profile is no longer available",
}) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    onNavigateAway?.();
    navigate(-1);
  };

  const handleSearchUsers = () => {
    onNavigateAway?.();
    navigate("/search");
  };

  return (
    <div className="flex justify-center items-center py-6">
      <Card
        className="w-full max-w-md bg-base-100 shadow-sm"
        hoverable={false}
        titleClassName="hidden"
      >
        <div className="flex flex-col items-center text-center gap-5 py-4">
          <UserAvatar
            user={null}
            deleted
            sizeClass="w-24 h-24"
            iconSize={40}
            initialsClassName="text-2xl font-medium"
          />

          <div className="space-y-1">
            <p className="text-lg font-medium text-base-content/70">
              {title}
            </p>
            <p className="text-sm text-base-content/50">
              {subtitle}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="ghost" onClick={handleGoBack}>
              Go Back
            </Button>
            <Button variant="primary" onClick={handleSearchUsers}>
              Search Users
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DeletedUserProfilePlaceholder;
