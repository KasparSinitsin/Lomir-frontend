import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Alert from "../components/common/Alert";
import BadgesDisplaySection from "../components/badges/BadgesDisplaySection";
import UserAvatar from "../components/users/UserAvatar";
import DeletedUserProfilePlaceholder from "../components/users/DeletedUserProfilePlaceholder";
import { userService } from "../services/userService";

const unwrapUserPayload = (response) => {
  const payload = response?.data ?? response;

  if (payload?.success !== undefined) {
    return payload?.data ?? null;
  }

  return payload?.data?.data ?? payload?.data ?? payload ?? null;
};

const getUserDisplayName = (user) => {
  const firstName = user?.firstName || user?.first_name || "";
  const lastName = user?.lastName || user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || user?.username || "Unknown User";
};

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showDeletedUserPlaceholder, setShowDeletedUserPlaceholder] =
    useState(false);

  const isNumericUserId = /^\d+$/.test(String(id ?? "").trim());

  useEffect(() => {
    let isCancelled = false;

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        setShowDeletedUserPlaceholder(false);

        const response = await userService.getUserById(id);
        const userData = unwrapUserPayload(response);

        if (isCancelled) return;

        setUser(userData);
      } catch (err) {
        if (isCancelled) return;

        console.error("Error fetching public profile:", err);

        if (err.response?.status === 404 && isNumericUserId) {
          setUser(null);
          setError(null);
          setShowDeletedUserPlaceholder(true);
          return;
        }

        setUser(null);
        setShowDeletedUserPlaceholder(false);
        setError("Failed to load this profile. Please try again.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    if (!id) {
      setLoading(false);
      setError("No profile ID was provided.");
      return () => {
        isCancelled = true;
      };
    }

    fetchUser();

    return () => {
      isCancelled = true;
    };
  }, [id, isNumericUserId]);

  const displayName = useMemo(() => getUserDisplayName(user), [user]);
  const username = user?.username ? `@${user.username}` : null;
  const bio = user?.bio || user?.biography || "";
  const badges = Array.isArray(user?.badges) ? user.badges : [];

  if (loading) {
    return (
      <PageContainer title="Profile" variant="transparent" frame={false}>
        <div className="flex justify-center items-center py-16">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (showDeletedUserPlaceholder) {
    return (
      <PageContainer variant="transparent" frame={false}>
        <DeletedUserProfilePlaceholder
          title="This user profile does not exist on Lomir"
          subtitle="This profile is not available"
        />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Profile" variant="transparent" frame={false}>
        <div className="flex justify-center py-8">
          <Alert type="error" message={error} />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Profile" variant="transparent" frame={false}>
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl bg-base-100 shadow-sm" hoverable={false}>
          <div className="space-y-8">
            <div className="flex flex-col items-center text-center gap-4">
              <UserAvatar
                user={user}
                sizeClass="w-24 h-24"
                iconSize={40}
                initialsClassName="text-2xl font-medium"
              />
              <div className="space-y-1">
                <h1 className="text-2xl font-medium text-primary">
                  {displayName}
                </h1>
                {username && (
                  <p className="text-sm text-base-content/60">{username}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-base-content/50">
                Bio
              </h2>
              <p className="text-base-content/75">
                {bio || "This user has not added a bio yet."}
              </p>
            </div>

            <BadgesDisplaySection
              title="Badges"
              badges={badges}
              emptyMessage="No badges earned yet"
              groupByCategory={true}
              showCredits={true}
            />

            <div className="flex justify-center">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                Back
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};

export default PublicProfile;
