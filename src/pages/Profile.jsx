import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FormSectionDivider from "../components/common/FormSectionDivider";
import { useAuth } from "../contexts/AuthContext";
import PageContainer from "../components/layout/PageContainer";
import Section from "../components/layout/Section";
import Grid from "../components/layout/Grid";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import DataDisplay from "../components/common/DataDisplay";
import ScreenAlert from "../components/common/ScreenAlert";
import Tooltip from "../components/common/Tooltip";
import { uploadToImageKit } from "../config/imagekit";
import {
  Mail,
  MapPin,
  User,
  Edit,
  Eye,
  EyeClosed,
  Award,
  Camera,
  Tag,
  Calendar,
  FlaskConical,
  Trash2,
} from "lucide-react";
import useAwardModals from "../hooks/useAwardModals";
import { CATEGORY_COLORS } from "../constants/badgeConstants";
import { userService } from "../services/userService";
import { useStructuredTags } from "../hooks/useTagQueries";
import {
  useUserProfile,
  useUserTags,
  userProfileQueryKey,
  userTagsQueryKey,
} from "../hooks/useUserQueries";
import TagInput from "../components/tags/TagInput";
import BadgesDisplaySection from "../components/badges/BadgesDisplaySection";
import SupercategoryAwardsModal from "../components/badges/SupercategoryAwardsModal";
import { useUserModal } from "../contexts/UserModalContext";
import BadgeCategoryModal from "../components/badges/BadgeCategoryModal";
import TagsDisplaySection from "../components/tags/TagsDisplaySection";
import TagAwardsModal from "../components/badges/TagAwardsModal";
import LocationDisplay from "../components/common/LocationDisplay";
import { geocodingService } from "../services/geocodingService";
import { useLocationAutoFill } from "../hooks/useLocationAutoFill";
import ImageUploader from "../components/common/ImageUploader";
import {
  DEMO_PROFILE_TOOLTIP,
  getUserInitials,
  isSyntheticUser,
} from "../utils/userHelpers";
import DemoAvatarOverlay from "../components/users/DemoAvatarOverlay";
import ConfirmModal from "../components/common/ConfirmModal";
import LocationInput from "../components/common/LocationInput";
import { format } from "date-fns";

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [localUser, setLocalUser] = useState(null);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [tags, setTags] = useState([]);
  // badges come from GET /api/users/:id as totals in user.badges
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [userTagObjects, setUserTagObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const { openUserModal } = useUserModal();
  const { data: structuredTags, error: structuredTagsError } =
    useStructuredTags();
  const {
    data: fetchedProfileUser,
    error: profileUserError,
  } = useUserProfile(user?.id, {
    enabled: Boolean(user?.id),
  });
  const { data: fetchedUserTags = [], error: userTagsError } = useUserTags(
    user?.id,
    {
      enabled: Boolean(user?.id),
    },
  );

  // Compute effective userId for the hook (Profile uses localUser or auth user)
  const profileUserId = localUser?.id ?? user?.id;

  const fetchUserAwards = useCallback(
    () => userService.getUserBadges(profileUserId),
    [profileUserId],
  );
  const {
    handleBadgeCategoryClick,
    handleBadgeClick,
    handleTagClick,
    handleSupercategoryClick,
    badgeCategoryModalProps,
    tagAwardsModalProps,
    supercategoryModalProps,
    removeAwardFromBadgeModal,
  } = useAwardModals({ fetchTagAwards: fetchUserAwards, fetchBadgeAwards: fetchUserAwards });

  const [avatarDeleteLoading, setAvatarDeleteLoading] = useState(false);
  const [isAvatarDeleteDialogOpen, setIsAvatarDeleteDialogOpen] =
    useState(false);
  const [badgeActionLoadingKey, setBadgeActionLoadingKey] = useState(null);
  const [pendingBadgeAction, setPendingBadgeAction] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Add form errors state
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    bio: "",
    city: "",
    postalCode: "",
    country: "",
    isPublic: true,
    profileImage: null,
  });
  // Add a flag to track if initial data load has happened
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Badge highlight from notification click-through
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollToBadges = searchParams.get("scrollTo") === "badges";
  const highlightBadgeName = searchParams.get("highlightBadge");
  const editModeFromUrl = searchParams.get("mode") === "edit";
  const [highlightTagName, setHighlightTagName] = useState(null);
  const [highlightTagColor, setHighlightTagColor] = useState(null);
  const badgesSectionRef = useRef(null);
  const focusAreasSectionRef = useRef(null);

  // Prefer freshest API user (includes badges totals). Fall back to auth context.
  const displayUser = localUser || user;
  const displayBadges = Array.isArray(displayUser?.badges)
    ? displayUser.badges
    : [];
  const hiddenAwardIds = displayUser?.hiddenAwardIds ?? [];

  // Auto-fill city from postal code lookup
  const { getSuggestedUpdates } = useLocationAutoFill({
    postalCode: formData.postalCode,
    city: formData.city,
    country: formData.country,
    isEditing,
  });

  // Format member since date
  const getMemberSinceDate = () => {
    const date = user?.created_at || user?.createdAt;
    if (!date) return "Unknown";
    try {
      return format(new Date(date), "MMMM yyyy");
    } catch (error) {
      console.error("Error formatting member since date:", error);
      return "Unknown";
    }
  };

  // Helper function to robustly check if profile is public
  const isProfilePublic = () => {
    if (user) {
      // During editing, prefer form data which comes from API
      if (isEditing) {
        return formData.isPublic === true;
      }

      // Check API data first (this should be the source of truth)
      if (formData.isPublic !== undefined && !isEditing) {
        return formData.isPublic === true;
      }

      // Fall back to user context data
      if (user.isPublic === true) return true;
      if (user.isPublic === false) return false;

      // Default to hidden profile if not specified
      return false;
    }
    return false;
  };

  useEffect(() => {
    const message = localStorage.getItem("registrationMessage");
    if (message) {
      setRegistrationMessage(message);
      localStorage.removeItem("registrationMessage");
    }
  }, []);

  useEffect(() => {
    // Initialize form data from context if available and we haven't loaded from API yet
    if (user && !initialDataLoaded) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        email: user.email || "",
        bio: user.bio || "",
        city: user.city || "",
        postalCode: user.postalCode || "",
        country: user.country || "",
        isPublic:
          user.isPublic !== undefined ? user.isPublic : true,
        profileImage: null,
      });

      // Set image preview if available
      if (user.avatarUrl) {
        setImagePreview(user.avatarUrl);
      }
    }
  }, [user, initialDataLoaded]);

  useEffect(() => {
    if (!fetchedProfileUser) return;

    if (!initialDataLoaded || !isEditing) {
      setFormData({
        firstName: fetchedProfileUser.firstName || "",
        lastName: fetchedProfileUser.lastName || "",
        username: fetchedProfileUser.username || "",
        email: fetchedProfileUser.email || "",
        bio: fetchedProfileUser.bio || "",
        postalCode: fetchedProfileUser.postalCode || "",
        city: fetchedProfileUser.city || "",
        country: fetchedProfileUser.country || "",
        isPublic:
          fetchedProfileUser.isPublic !== undefined
            ? fetchedProfileUser.isPublic
            : true,
        profileImage: null,
      });

      if (fetchedProfileUser.avatarUrl) {
        setImagePreview(fetchedProfileUser.avatarUrl);
      }
    }

    setLocalUser(fetchedProfileUser);
    setInitialDataLoaded(true);
  }, [fetchedProfileUser, initialDataLoaded, isEditing]);

  useEffect(() => {
    if (structuredTags) setTags(structuredTags);
  }, [structuredTags]);

  useEffect(() => {
    setSelectedTags(fetchedUserTags.map((tag) => tag.id));
    setUserTagObjects(fetchedUserTags);
  }, [fetchedUserTags]);

  useEffect(() => {
    if (structuredTagsError) {
      console.error("Error fetching tags:", structuredTagsError);
    }
  }, [structuredTagsError]);

  useEffect(() => {
    if (userTagsError) {
      console.error("Error fetching user tags:", userTagsError);
    }
  }, [userTagsError]);

  useEffect(() => {
    if (profileUserError) {
      console.error("Error fetching user details:", profileUserError);
      setError("Failed to load user data. Please try again.");
    }
  }, [profileUserError]);

  // Reset image error state when user changes
  useEffect(() => {
    setImageError(false);
  }, [user?.avatarUrl]);

  // Auto-fill city and country when postal code lookup returns a result
  useEffect(() => {
    if (isEditing) {
      const updates = getSuggestedUpdates();
      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [getSuggestedUpdates, isEditing]);

  // Scroll to badges section when navigated from a badge notification
  useEffect(() => {
    if (scrollToBadges && badgesSectionRef.current && !isEditing) {
      // Wait for data to load, then scroll
      const timer = setTimeout(() => {
        badgesSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 500);

      // Clear URL params and highlight state after 4 seconds
      const clearTimer = setTimeout(() => {
        setSearchParams({}, { replace: true });
        setHighlightTagName(null);
        setHighlightTagColor(null);
      }, 4000);

      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [scrollToBadges, isEditing, setSearchParams]);

  useEffect(() => {
    if (editModeFromUrl && !isEditing) {
      setIsEditing(true);
    }
  }, [editModeFromUrl, isEditing]);

  const clearEditModeParam = useCallback(() => {
    if (!editModeFromUrl) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("mode");
    setSearchParams(nextParams, { replace: true });
  }, [editModeFromUrl, searchParams, setSearchParams]);

  // Derive the associated tag name when a badge is highlighted from notification
  useEffect(() => {
    if (!highlightBadgeName || !user?.id) return;

    const deriveHighlightTag = async () => {
      try {
        const profileUserId = localUser?.id ?? user?.id;
        const response = await userService.getUserBadges(profileUserId);
        const payload = response?.data || response;
        const rows = Array.isArray(payload) ? payload : payload?.data || [];

        // Find the most recent award matching this badge name that has a tag
        const matchingAward = rows
          .filter((award) => {
            const awardBadgeName =
              award.badgeName ?? award.badge_name ?? award.name;
            return (
              String(awardBadgeName ?? "")
                .trim()
                .toLowerCase() ===
              String(highlightBadgeName).trim().toLowerCase()
            );
          })
          .sort((a, b) => {
            const dateA = new Date(a.awardedAt ?? a.awarded_at ?? 0);
            const dateB = new Date(b.awardedAt ?? b.awarded_at ?? 0);
            return dateB - dateA; // most recent first
          })
          .find((award) => award.tagName ?? award.tag_name);

        if (matchingAward) {
          setHighlightTagName(matchingAward.tagName ?? matchingAward.tag_name);
          // Pass the badge's category color so the tag pill highlights in the right color
          const badgeCategory =
            matchingAward.badgeCategory ?? matchingAward.badge_category;
          setHighlightTagColor(CATEGORY_COLORS[badgeCategory] || null);
        }
      } catch (error) {
        console.error("Error deriving highlight tag:", error);
      }
    };

    deriveHighlightTag();
  }, [highlightBadgeName, user?.id, localUser?.id]);

  const handleSelectedTagsChange = (newTags) => {
    setSelectedTags(newTags);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData((prevData) => ({
      ...prevData,
      [name]: newValue,
    }));

    // Clear any error for this field when user makes changes
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle location field changes (maps snake_case to camelCase)
  const handleLocationChange = (e) => {
    const { name, value } = e.target;

    // Map snake_case field names to camelCase
    const fieldMap = {
      postal_code: "postalCode",
      city: "city",
      country: "country",
    };

    const mappedName = fieldMap[name] || name;

    setFormData((prev) => ({
      ...prev,
      [mappedName]: value,
    }));

    // Clear any error for this field
    if (formErrors[mappedName] || formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[mappedName];
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle avatar deletion
  const handleAvatarDelete = () => {
    if (!user) return;
    setIsAvatarDeleteDialogOpen(true);
  };

  const closeAvatarDeleteDialog = () => {
    if (avatarDeleteLoading) return;
    setIsAvatarDeleteDialogOpen(false);
  };

  const confirmAvatarDelete = async () => {
    if (!user) return;
    try {
      setAvatarDeleteLoading(true);
      setError(null);

      const response = await userService.deleteUserAvatar(user.id);

      if (response.success) {
        // Clear the image preview
        setImagePreview(null);

        // Update the user context to remove avatar
        const updatedUser = {
          ...user,
          avatarUrl: null,
        };
        updateUser(updatedUser);
        setLocalUser(updatedUser);

        // Reset the file input in form data
        setFormData((prev) => ({
          ...prev,
          profileImage: null,
        }));

        setSuccess("Profile picture removed successfully");
        setIsAvatarDeleteDialogOpen(false);
      } else {
        setError(response.message || "Failed to remove profile picture");
      }
    } catch (error) {
      console.error("Error deleting avatar:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to remove profile picture. Please try again.",
      );
    } finally {
      setAvatarDeleteLoading(false);
    }
  };

  const getAwardId = (award) => award?.awardId ?? award?.award_id ?? award?.id;
  const getBadgeId = (awardOrBadge) => {
    const explicitBadgeId = awardOrBadge?.badgeId ?? awardOrBadge?.badge_id;
    if (explicitBadgeId !== undefined && explicitBadgeId !== null) {
      return explicitBadgeId;
    }

    const hasAwardId =
      awardOrBadge?.awardId !== undefined || awardOrBadge?.award_id !== undefined;
    return hasAwardId ? undefined : awardOrBadge?.id;
  };
  const getBadgeName = (awardOrBadge) =>
    (
      awardOrBadge?.badgeName ??
      awardOrBadge?.badge_name ??
      awardOrBadge?.name ??
      ""
    ).trim();
  const getAwardContextLabel = (award) => {
    const contextType = award?.contextType ?? award?.context_type;

    switch (contextType) {
      case "team":
        return "Team Contribution";
      case "project":
        return "Project Contribution";
      case "personal":
      case "profile":
      case "chat":
        return "Personal Contribution";
      default:
        return "Contribution";
    }
  };
  const getAwarderName = (award) => {
    const firstName =
      award?.awardedByFirstName ?? award?.awarded_by_first_name ?? "";
    const lastName =
      award?.awardedByLastName ?? award?.awarded_by_last_name ?? "";
    const fullName = `${firstName} ${lastName}`.trim();

    return (
      fullName ||
      award?.awardedByUsername ||
      award?.awarded_by_username ||
      "another user"
    );
  };
  const getAwardTagName = (award) => award?.tagName ?? award?.tag_name ?? null;

  const sameBadge = (badge, awardOrBadge) => {
    const badgeId = getBadgeId(badge);
    const targetBadgeId = getBadgeId(awardOrBadge);
    if (
      badgeId !== undefined &&
      badgeId !== null &&
      targetBadgeId !== undefined &&
      targetBadgeId !== null
    ) {
      return String(badgeId) === String(targetBadgeId);
    }

    const badgeName = getBadgeName(badge).toLowerCase();
    const targetBadgeName = getBadgeName(awardOrBadge).toLowerCase();
    return Boolean(badgeName && targetBadgeName && badgeName === targetBadgeName);
  };

  const updateLocalUserBadges = (updater) => {
    setLocalUser((prev) => {
      const source = prev || user;
      if (!source) return prev;

      const nextUser = updater(source);
      updateUser(nextUser);
      return nextUser;
    });
  };

  const handleHideBadge = (award) => {
    setPendingBadgeAction({ type: "hide", award });
  };

  const handleDeleteBadgeAward = (award) => {
    setPendingBadgeAction({ type: "delete", award });
  };

  const closePendingBadgeAction = () => {
    if (badgeActionLoadingKey) return;
    setPendingBadgeAction(null);
  };

  const executeHideBadge = async (award) => {
    if (!user?.id) return;

    const awardId = getAwardId(award);
    if (!awardId) {
      setError("Could not hide this badge award because it is missing an ID.");
      return;
    }

    const loadingKey = `hide-${awardId}`;

    try {
      setError(null);
      setBadgeActionLoadingKey(loadingKey);
      await userService.updateUserBadgeVisibility(user.id, awardId, true);

      updateLocalUserBadges((currentUser) => {
        const hiddenIds =
          currentUser.hiddenAwardIds ?? [];
        const nextHiddenIds = hiddenIds
          .map((value) => String(value))
          .includes(String(awardId))
          ? hiddenIds
          : [...hiddenIds, awardId];

        return {
          ...currentUser,
          hiddenAwardIds: nextHiddenIds,
        };
      });

      setSuccess("Badge hidden from others.");
      setPendingBadgeAction(null);
    } catch (err) {
      console.error("Failed to hide badge:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to hide badge. Please try again.",
      );
    } finally {
      setBadgeActionLoadingKey(null);
    }
  };

  const handleShowBadge = async (award) => {
    if (!user?.id) return;

    const awardId = getAwardId(award);
    if (!awardId) {
      setError("Could not show this badge award because it is missing an ID.");
      return;
    }

    const loadingKey = `show-${awardId}`;

    try {
      setError(null);
      setBadgeActionLoadingKey(loadingKey);
      await userService.updateUserBadgeVisibility(user.id, awardId, false);

      updateLocalUserBadges((currentUser) => {
        const hiddenIds =
          currentUser.hiddenAwardIds ?? [];
        const nextHiddenIds = hiddenIds.filter(
          (value) => String(value) !== String(awardId),
        );

        return {
          ...currentUser,
          hiddenAwardIds: nextHiddenIds,
        };
      });

      setSuccess("Badge visible for others.");
    } catch (err) {
      console.error("Failed to show badge:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to make badge visible. Please try again.",
      );
    } finally {
      setBadgeActionLoadingKey(null);
    }
  };

  const executeDeleteBadgeAward = async (award) => {
    if (!user?.id) return;

    const awardId = getAwardId(award);
    if (!awardId) {
      setError("Could not delete this badge award because it is missing an ID.");
      return;
    }

    const loadingKey = `delete-${awardId}`;
    const removedCredits = Number(award?.credits ?? 0);

    try {
      setError(null);
      setBadgeActionLoadingKey(loadingKey);
      await userService.deleteUserBadgeAward(user.id, awardId);

      removeAwardFromBadgeModal(award);
      setUserTagObjects((currentTags) => {
        const awardTagName = getAwardTagName(award);
        if (!awardTagName) return currentTags;

        return currentTags
          .map((tag) => {
            const tagName = tag.name ?? tag.tag_name;
            if (tagName !== awardTagName) return tag;

            const currentCredits = Number(
              tag.badgeCredits ?? tag.badge_credits ?? 0,
            );
            const nextCredits = Math.max(0, currentCredits - removedCredits);

            return {
              ...tag,
              badgeCredits: nextCredits,
              badge_credits: nextCredits,
            };
          })
          .filter((tag) => Number(tag.badgeCredits ?? tag.badge_credits ?? 0) > 0);
      });
      updateLocalUserBadges((currentUser) => ({
        ...currentUser,
        badges: Array.isArray(currentUser.badges)
          ? currentUser.badges
              .map((badge) => {
                if (!sameBadge(badge, award)) return badge;

                const currentCredits = Number(
                  badge.total_credits ?? badge.totalCredits ?? 0,
                );
                const currentAwardCount = Number(
                  badge.award_count ?? badge.awardCount ?? 1,
                );
                const nextCredits = Math.max(0, currentCredits - removedCredits);
                const nextAwardCount = Math.max(0, currentAwardCount - 1);

                if (nextCredits <= 0 || nextAwardCount <= 0) return null;

                return {
                  ...badge,
                  total_credits: nextCredits,
                  totalCredits: nextCredits,
                  award_count: nextAwardCount,
                  awardCount: nextAwardCount,
                };
              })
              .filter(Boolean)
          : currentUser.badges,
      }));

      setSuccess("Badge award deleted.");
      setPendingBadgeAction(null);
    } catch (err) {
      console.error("Failed to delete badge award:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete badge award. Please try again.",
      );
    } finally {
      setBadgeActionLoadingKey(null);
    }
  };

  const handleTagsUpdate = async (newTags) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Use the newTags parameter instead of selectedTags
      await userService.updateUserTags(user.id, newTags);

      // Update Profile's state with the new tags
      setSelectedTags(newTags);
      queryClient.invalidateQueries({
        queryKey: userTagsQueryKey(user.id),
      });

      setSuccess("Tags updated successfully");
    } catch (error) {
      console.error("Error updating user tags:", error);
      setError("Failed to update tags. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add form validation function
  const validateForm = () => {
    const errors = {};

    // Username validation
    if (!formData.username.trim()) {
      errors.username = "Username is required";
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.username.trim())) {
      errors.username = "Use 3–20 chars: letters, numbers, underscore";
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    // First name validation (optional)
    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }

    // Add more validations if needed

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    // Validate form before proceeding
    if (!validateForm()) {
      return; // Stop execution if validation fails
    }

    try {
      setLoading(true);
      setError(null);

      // Create an object to hold the updated user data
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username.trim(),
        email: formData.email,
        bio: formData.bio,
        postalCode: formData.postalCode,
        city: formData.city,
        country: formData.country,
        isPublic: formData.isPublic,
      };

      // Handle image upload if a new image was selected
      let avatarUrl = null;
      if (formData.profileImage) {
        const uploadResult = await uploadToImageKit(
          formData.profileImage,
          "avatars",
        );
        if (uploadResult.success) {
          avatarUrl = uploadResult.url;
          userData.avatarUrl = avatarUrl;
          userData.avatarFileId = uploadResult.fileId;
          setImagePreview(avatarUrl);
        } else {
          console.error("Avatar upload failed:", uploadResult.error);
          setError(
            "Failed to upload image. Please try a different image or try again later.",
          );
          setLoading(false);
          return;
        }
      }

      const response = await userService.updateUser(user.id, userData);

      if (!response || response.success === false) {
        console.error(
          "Update failed:",
          response?.message || "No response received",
        );
        setError(
          "Failed to update profile: " + (response?.message || "Unknown error"),
        );
      } else {
        // Update tags along with profile
        try {
          await userService.updateUserTags(user.id, selectedTags);
          queryClient.invalidateQueries({
            queryKey: userTagsQueryKey(user.id),
          });
        } catch (tagError) {
          console.error("Error updating tags:", tagError);
          // Don't fail the whole operation if tags fail
        }

        setIsEditing(false);
        clearEditModeParam();
        setSuccess("Profile updated successfully");

        // Create updated user object with correct avatar URL
        const updatedUser = {
          ...user,
          isPublic: formData.isPublic,
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username.trim(),
          email: formData.email, // Include email in the updated user object
          bio: formData.bio,
          city: formData.city,
          country: formData.country,
          // Pick up geocoded state & coordinates from the API response
          state: response.data?.state ?? user.state,
          latitude: response.data?.latitude ?? user.latitude,
          longitude: response.data?.longitude ?? user.longitude,
          // Use the avatar URL from ImageKit if we uploaded a new image,
          // otherwise use the response data or keep the existing avatar
          avatarUrl: avatarUrl || response.data?.avatarUrl || user.avatarUrl,
          userName: formData.username,
          postalCode: formData.postalCode,
        };

        // Update global context with new user data
        updateUser(updatedUser);

        // Force a local state update
        setLocalUser(updatedUser);
        queryClient.setQueryData(userProfileQueryKey(user.id), updatedUser);
        queryClient.invalidateQueries({
          queryKey: userProfileQueryKey(user.id),
        });

        // Reset form data with updated values
        setFormData((prev) => ({
          ...prev,
          firstName: updatedUser.firstName || "",
          lastName: updatedUser.lastName || "",
          username: updatedUser.username || "",
          email: updatedUser.email || "", // Keep the email in the form data
          bio: updatedUser.bio || "",
          postalCode: updatedUser.postalCode || "",
          city: updatedUser.city || "",
          country: updatedUser.country || "",
          isPublic: updatedUser.isPublic || false,
          profileImage: null, // Reset profile image after successful update
        }));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError(
        "Failed to update profile: " + (error.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  // For debugging purposes
  const displayUserData = () => {
    if (!user) return "No user data available";

    return (
      <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
        {JSON.stringify(user, null, 2)}
      </pre>
    );
  };

  const displayFormData = () => {
    return (
      <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
        {JSON.stringify(formData, null, 2)}
      </pre>
    );
  };

  if (!displayUser) {
    return (
      <PageContainer>
        <div className="w-full max-w-lg mx-auto">
          <Card>
            <div className="text-center p-4">
              <h2 className="text-xl font-semibold text-error mb-4">
                User Not Found
              </h2>
              <p className="mb-6">Please login again to access your profile.</p>
              <Link to="/login" className="btn btn-primary">
                Go to Login
              </Link>
            </div>
          </Card>
        </div>
      </PageContainer>
    );
  }

  const profileLocation = {
    postalCode: displayUser.postalCode || "",
    city: displayUser.city || "",
    state: displayUser.state || "",
    country: displayUser.country || "",
  };
  const hasProfileLocation = Boolean(
    profileLocation.postalCode ||
      profileLocation.city ||
      profileLocation.state ||
      profileLocation.country,
  );
  const pendingBadgeAward = pendingBadgeAction?.award;
  const pendingBadgeActionType = pendingBadgeAction?.type;
  const pendingBadgeAwardDescription = pendingBadgeAward
    ? `"${getAwardContextLabel(pendingBadgeAward)}" Award from ${getAwarderName(
        pendingBadgeAward,
      )}`
    : "this badge award";
  const pendingBadgeActionLoading = Boolean(
    pendingBadgeAward &&
      badgeActionLoadingKey ===
        `${pendingBadgeActionType}-${getAwardId(pendingBadgeAward)}`,
  );
  const confirmPendingBadgeAction = () => {
    if (!pendingBadgeAward) return;

    if (pendingBadgeActionType === "hide") {
      executeHideBadge(pendingBadgeAward);
      return;
    }

    if (pendingBadgeActionType === "delete") {
      executeDeleteBadgeAward(pendingBadgeAward);
    }
  };

  return (
    <div className="space-y-6">
      <ScreenAlert
        alerts={[
          registrationMessage && {
            type: "success",
            message: registrationMessage,
            onClose: () => setRegistrationMessage(""),
          },
          success && {
            type: "success",
            message: success,
            onClose: () => setSuccess(null),
          },
          error && {
            type: "error",
            message: error,
            onClose: () => setError(null),
          },
        ]}
      />

      <Card className="overflow-visible">
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProfileUpdate();
            }}
            className="p-6 space-y-12"
          >
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Edit size={22} className="flex-shrink-0" />
              Edit Profile
            </h2>

            {/* Profile Picture */}
            <section className="space-y-4">
              <FormSectionDivider text="Profile Picture" icon={Camera} />

              <div className="w-full flex justify-center">
                <div className="w-full max-w-md mt-5">
                  <ImageUploader
                    currentImage={
                      imagePreview || user?.avatarUrl
                    }
                    onImageSelect={(file, previewUrl) => {
                      setFormData((prev) => ({
                        ...prev,
                        profileImage: file,
                      }));
                      setImagePreview(previewUrl);
                    }}
                    onImageRemove={handleAvatarDelete}
                    fallbackText={getUserInitials(user)}
                    shape="circle"
                    size="xl"
                    disabled={loading}
                    loading={avatarDeleteLoading}
                    showRemoveButton={
                      !!(imagePreview || user?.avatarUrl) &&
                      !formData.profileImage
                    }
                    removeButtonText="Remove Current Picture"
                  />
                </div>
              </div>
            </section>

            {/* Profile Details */}
            <section className="space-y-4">
              <FormSectionDivider text="Profile Details" icon={User} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Username */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Username</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`input input-bordered w-full ${
                      formErrors.username ? "input-error" : ""
                    }`}
                    placeholder="Username"
                    autoComplete="off"
                  />
                  {formErrors.username && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {formErrors.username}
                      </span>
                    </label>
                  )}
                  <p className="form-helper-text">
                    3–20 characters, letters/numbers/underscore.
                  </p>
                </div>

                {/* First Name */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">First Name</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`input input-bordered w-full ${
                      formErrors.firstName ? "input-error" : ""
                    }`}
                    placeholder="First Name"
                  />
                  {formErrors.firstName && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {formErrors.firstName}
                      </span>
                    </label>
                  )}
                </div>

                {/* Last Name */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Last Name</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">About Me</span>
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className="textarea textarea-bordered w-full"
                  placeholder="Tell us about yourself"
                  rows="4"
                />
              </div>
            </section>

            {/* Location Section */}
            <section>
              <LocationInput
                formData={{
                  postal_code: formData.postalCode,
                  city: formData.city,
                  country: formData.country,
                }}
                onChange={handleLocationChange}
                errors={{
                  postal_code: formErrors.postalCode,
                  city: formErrors.city,
                  country: formErrors.country,
                }}
                disabled={loading}
                showRemoteToggle={false}
                showDivider={true}
                dividerText="Location"
              />
            </section>

            {/* Focus Areas */}
            <section className="space-y-4">
              <FormSectionDivider text="Focus Areas" icon={Tag} />

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">
                    Select focus areas matching your interests and skills
                  </span>
                </label>

                <TagInput
                  selectedTags={selectedTags}
                  onTagsChange={handleSelectedTagsChange}
                  placeholder="Type to search focus areas..."
                />
              </div>
            </section>

            <div className="divider mt-12 mb-0"></div>

            {/* Actions */}
            <section className="flex justify-end space-x-2 !mt-4">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    clearEditModeParam();
                  }}
                  disabled={loading}
                >
                Cancel
              </Button>

              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </section>
          </form>
        ) : (
          <div>
            {/* Page Header with Title and Actions */}
            <div className="flex items-center justify-between p-6 pb-4">
              <h1 className="text-2xl sm:text-3xl font-medium text-primary">
                Your Profile
              </h1>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="hover:bg-[#7ace82] hover:text-[#036b0c]"
                  icon={<Edit size={16} />}
                >
                  Edit
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-base-300 -mx-4 sm:-mx-7"></div>

            <div className="flex flex-col md:flex-row md:items-start p-6">
              {/* Avatar */}
              <div className="mb-4 md:mb-0 md:mr-8 flex-shrink-0">
                <div className="avatar placeholder">
                  <div className="bg-[var(--color-primary-focus)] text-primary-content rounded-full w-32 h-32 relative overflow-hidden">
                    {user.avatarUrl && !imageError ? (
                      <img
                        src={user.avatarUrl}
                        alt="Profile"
                        className="rounded-full object-cover w-full h-full"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <span className="text-4xl">{getUserInitials(user)}</span>
                    )}
                    {isSyntheticUser(user) && <DemoAvatarOverlay textClassName="text-[14px]" textTranslateClassName="-translate-y-[7px]" />}
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-grow min-w-0">
                {/* Name */}
                <h2 className="text-3xl font-bold leading-[120%] mb-[0.2em]">
                  {user.firstName || ""}{" "}
                  {user.lastName || ""}
                </h2>

                {/* Username, visibility, and date in one row */}
                <div className="flex items-center text-base flex-wrap gap-x-4 gap-y-1">
                  <span className="text-base-content/70">@{user.username}</span>
                  <div
                    className="flex items-center text-base-content/70 tooltip tooltip-bottom tooltip-lomir cursor-help"
                    data-tip={
                      isProfilePublic()
                        ? "Public Profile - visible for everyone"
                        : "Private Profile - only visible for you"
                    }
                  >
                    {isProfilePublic() ? (
                      <>
                        <Eye size={20} className="mr-1 text-green-600" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <EyeClosed size={20} className="mr-1 text-gray-500" />
                        <span>Private</span>
                      </>
                    )}
                  </div>
                  {isSyntheticUser(user) && (
                    <Tooltip
                      content={DEMO_PROFILE_TOOLTIP}
                      wrapperClassName="flex items-start text-base-content/50"
                    >
                      <FlaskConical className="h-3.5 w-auto mr-0.5 flex-shrink-0 mt-px" />
                      <span className="leading-[1.15]">Demo Profile</span>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Member Since - DESKTOP ONLY, far right */}
              <div
                className="hidden md:flex items-center text-base text-base-content/60 tooltip tooltip-bottom tooltip-lomir cursor-help flex-shrink-0"
                data-tip={`Joined Lomir in ${getMemberSinceDate()}`}
              >
                <Calendar size={16} className="mr-1" />
                <span>{getMemberSinceDate()}</span>
              </div>
            </div>

            {/* Bio Section */}
            {user.bio && (
              <div className="px-6 mb-12">
                <p className="text-base-content/90">{user.bio}</p>
              </div>
            )}

            {/* Contact, Focus Areas & Badges */}
            {(() => {
              const hasTags =
                userTagObjects.length > 0 ||
                (selectedTags && selectedTags.length > 0);
              const hasBadges =
                displayBadges.length > 0;
              const bothEmpty = !hasTags && !hasBadges;

              return (
                <div className="px-6 mt-6 pb-6">
                  {bothEmpty ? (
                    // All 4 items in one grid for perfect column alignment
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[0rem] gap-y-6">
                      <div>
                        <div className="flex items-center mb-2">
                          <Mail
                            size={18}
                            className="mr-2 text-primary flex-shrink-0"
                          />
                          <h3 className="font-medium">Email</h3>
                        </div>
                        <p className="text-sm text-base-content/60">
                          {user.email}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center mb-2">
                          <MapPin
                            size={18}
                            className="mr-2 text-primary flex-shrink-0"
                          />
                          <h3 className="font-medium">Location</h3>
                        </div>
                        {hasProfileLocation ? (
                          <LocationDisplay
                            postalCode={profileLocation.postalCode}
                            city={profileLocation.city}
                            state={profileLocation.state}
                            country={profileLocation.country}
                            className="text-sm text-base-content/60"
                            showIcon={false}
                            showPostalCode={true}
                            displayType="full"
                          />
                        ) : (
                          <p className="text-sm text-base-content/60">
                            No location added yet.
                          </p>
                        )}
                      </div>
                      <div ref={focusAreasSectionRef}>
                        <TagsDisplaySection
                          title="Focus Areas"
                          tags={
                            userTagObjects.length > 0
                              ? userTagObjects
                              : selectedTags
                          }
                          allTags={tags}
                          emptyMessage="No focus areas added yet."
                          onTagClick={handleTagClick}
                          onSupercategoryClick={handleSupercategoryClick}
                          highlightTagName={highlightTagName}
                          highlightTagColor={highlightTagColor}
                        />
                      </div>
                      <div ref={badgesSectionRef}>
                        <div className="flex items-center mb-2">
                          <Award
                            size={18}
                            className="mr-2 text-primary flex-shrink-0"
                          />
                          <h3 className="font-medium">My Badges</h3>
                        </div>
                        <p className="text-sm text-base-content/60">
                          No badges earned yet.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Has content: Email/Location flex row + stacked Focus Areas + Badges
                    <div className="space-y-6">
                      <div className="flex flex-wrap gap-x-[10rem] gap-y-6">
                        <div>
                          <div className="flex items-center mb-2">
                            <Mail
                              size={18}
                              className="mr-2 text-primary flex-shrink-0"
                            />
                            <h3 className="font-medium">Email</h3>
                          </div>
                          <p className="text-sm text-base-content/60">
                            {user.email}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center mb-2">
                            <MapPin
                              size={18}
                              className="mr-2 text-primary flex-shrink-0"
                            />
                            <h3 className="font-medium">Location</h3>
                          </div>
                          {hasProfileLocation ? (
                            <LocationDisplay
                              postalCode={profileLocation.postalCode}
                              city={profileLocation.city}
                              state={profileLocation.state}
                              country={profileLocation.country}
                              className="text-sm text-base-content/60"
                              showIcon={false}
                              showPostalCode={true}
                              displayType="full"
                            />
                          ) : (
                            <p className="text-sm text-base-content/60">
                              No location added yet.
                            </p>
                          )}
                        </div>
                      </div>
                      <div ref={focusAreasSectionRef}>
                        <TagsDisplaySection
                          title="Focus Areas"
                          tags={
                            userTagObjects.length > 0
                              ? userTagObjects
                              : selectedTags
                          }
                          allTags={tags}
                          emptyMessage="No focus areas added yet."
                          onTagClick={handleTagClick}
                          onSupercategoryClick={handleSupercategoryClick}
                          highlightTagName={highlightTagName}
                          highlightTagColor={highlightTagColor}
                        />
                      </div>
                      <div ref={badgesSectionRef}>
                        <BadgesDisplaySection
                          title="My Badges"
                          badges={displayBadges}
                          emptyMessage="No badges earned yet."
                          maxVisible={8}
                          groupByCategory={true}
                          showCredits={true}
                          onCategoryClick={handleBadgeCategoryClick}
                          onBadgeClick={handleBadgeClick}
                          onOpenUser={openUserModal}
                          highlightBadgeName={highlightBadgeName}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Card>

      {/* Badge Category Detail Modal */}
      <BadgeCategoryModal
        {...badgeCategoryModalProps}
        onOpenUser={openUserModal}
        highlightBadgeName={highlightBadgeName}
        onHideBadge={handleHideBadge}
        onShowBadge={handleShowBadge}
        onDeleteAward={handleDeleteBadgeAward}
        hiddenAwardIds={hiddenAwardIds}
        showHiddenBadgeAwards={true}
        badgeActionLoadingKey={badgeActionLoadingKey}
      />

      <ConfirmModal
        isOpen={isAvatarDeleteDialogOpen}
        onClose={closeAvatarDeleteDialog}
        onConfirm={confirmAvatarDelete}
        title="Remove Profile Picture"
        loading={avatarDeleteLoading}
        confirmLabel="Remove"
        loadingLabel="Removing..."
        confirmVariant="error"
        confirmIcon={<Trash2 size={16} />}
      >
        <p className="text-sm text-base-content/80">
          Remove your profile picture? Your profile will show your initials
          instead.
        </p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={Boolean(pendingBadgeAction)}
        onClose={closePendingBadgeAction}
        onConfirm={confirmPendingBadgeAction}
        title={pendingBadgeActionType === "delete" ? "Delete Badge Award" : "Hide Badge Award"}
        loading={pendingBadgeActionLoading}
        confirmLabel={pendingBadgeActionType === "delete" ? "Delete" : "Hide"}
        loadingLabel={pendingBadgeActionType === "delete" ? "Deleting..." : "Hiding..."}
        confirmVariant={pendingBadgeActionType === "delete" ? "error" : "primary"}
        confirmIcon={pendingBadgeActionType === "delete" ? <Trash2 size={16} /> : <EyeClosed size={16} />}
      >
        <p className="text-sm text-base-content/80">
          {pendingBadgeActionType === "delete"
            ? `Delete ${pendingBadgeAwardDescription} permanently? This removes only this awarded instance, not other awards for the same badge.`
            : `Hide ${pendingBadgeAwardDescription} from others? You will still see it on your profile with a closed-eye marker.`}
        </p>
      </ConfirmModal>

      <TagAwardsModal
        {...tagAwardsModalProps}
        onOpenUser={openUserModal}
        highlightBadgeName={highlightBadgeName}
        onHideBadge={handleHideBadge}
        onShowBadge={handleShowBadge}
        onDeleteAward={handleDeleteBadgeAward}
        hiddenAwardIds={hiddenAwardIds}
        showHiddenBadgeAwards={true}
        badgeActionLoadingKey={badgeActionLoadingKey}
      />

      {/* Supercategory Awards Modal */}
      <SupercategoryAwardsModal
        {...supercategoryModalProps}
        onOpenUser={openUserModal}
        highlightBadgeName={highlightBadgeName}
        onHideBadge={handleHideBadge}
        onShowBadge={handleShowBadge}
        onDeleteAward={handleDeleteBadgeAward}
        hiddenAwardIds={hiddenAwardIds}
        showHiddenBadgeAwards={true}
        badgeActionLoadingKey={badgeActionLoadingKey}
      />
    </div>
  );
};

export default Profile;
