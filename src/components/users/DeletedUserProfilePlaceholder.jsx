import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Card from "../common/Card";
import Button from "../common/Button";
import UserAvatar from "./UserAvatar";

/**
 * Shown when a profile cannot be opened.
 *
 * ⚠️ The wording is deliberately neutral and must stay that way. Both callers
 * reach this component from a single 404 on `GET /api/users/:id`, and that 404
 * has four causes the frontend cannot tell apart:
 *
 *   1. the account was deleted — a hard `DELETE FROM users`, so no row remains;
 *   2. the ID never existed;
 *   3. either party has blocked the other;
 *   4. the profile is private (`is_public = false`) and the viewer is neither
 *      its owner nor a teammate.
 *
 * Causes 3 and 4 answer 404 on purpose, so that neither a block nor a private
 * account can be detected from the outside — see `getUserById` in
 * `Lomir-backend/src/controllers/userController.js`.
 *
 * So "this user has left Lomir" is a claim the app cannot support in three of
 * the four cases, and it is a statement about a third person. Do not narrow the
 * text back to deletion, and do not add a `title` / `subtitle` override: one
 * wording for one indistinguishable state.
 */
const DeletedUserProfilePlaceholder = ({ onNavigateAway = null }) => {
  const { t } = useTranslation();
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
              {t("user.profileUnavailable.title")}
            </p>
            <p className="text-sm text-base-content/50">
              {t("user.profileUnavailable.subtitle")}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="ghost" onClick={handleGoBack}>
              {t("user.profileUnavailable.goBack")}
            </Button>
            <Button variant="primary" onClick={handleSearchUsers}>
              {t("user.profileUnavailable.searchUsers")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DeletedUserProfilePlaceholder;
