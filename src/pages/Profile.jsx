import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import FormSectionDivider from "../components/common/FormSectionDivider";
import { useAuth } from "../contexts/AuthContext";
import PageContainer from "../components/layout/PageContainer";
import Section from "../components/layout/Section";
import Grid from "../components/layout/Grid";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import DataDisplay from "../components/common/DataDisplay";
import Alert from "../components/common/Alert";
import { uploadToCloudinary } from "../config/cloudinary";
import {
  Mail,
  MapPin,
  User,
  Edit,
  Eye,
  EyeClosed,
  Award,
  Trash2,
  Camera,
  KeyRound,
  Tag,
  Calendar,
} from "lucide-react";
import { tagService } from "../services/tagService";
import { userService } from "../services/userService";
import TagInput from "../components/tags/TagInput";
import BadgeCategoryCard from "../components/badges/BadgeCategoryCard";
import BadgeCategoryModal from "../components/badges/BadgeCategoryModal";
import TagsDisplaySection from "../components/tags/TagsDisplaySection";
import VisibilityToggle from "../components/common/VisibilityToggle";
import LocationDisplay from "../components/common/LocationDisplay";
import { geocodingService } from "../services/geocodingService";
import { useLocationAutoFill } from "../hooks/useLocationAutoFill";
import ImageUploader from "../components/common/ImageUploader";
import { getUserInitials } from "../utils/userHelpers";
import Modal from "../components/common/Modal";
import LocationInput from "../components/common/LocationInput";
import { format } from "date-fns";
import UserDetailsModal from "../components/users/UserDetailsModal";

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const [localUser, setLocalUser] = useState(null);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [tags, setTags] = useState([]);
  // badges come from GET /api/users/:id as totals in user.badges
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [avatarDeleteLoading, setAvatarDeleteLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [badgeCategoryModal, setBadgeCategoryModal] = useState({
    isOpen: false,
    category: null,
    color: null,
    badges: [],
    totalCredits: 0,
  });
  const [detailedBadgeAwards, setDetailedBadgeAwards] = useState([]);
  const [badgeModalLoading, setBadgeModalLoading] = useState(false);

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

  // Prefer freshest API user (includes badges totals). Fall back to auth context.
  const displayUser = localUser || user;

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
      if (user.is_public === true) return true;
      if (user.isPublic === true) return true;
      if (user.is_public === false) return false;
      if (user.isPublic === false) return false;

      // Default to hidden profile if not specified
      return false;
    }
    return false;
  };

  // Fetch user details as a callback that doesn't re-create on each render
  const fetchUserDetails = useCallback(async () => {
    if (!user || !user.id || initialDataLoaded) return;

    try {
      setLoading(true);
      console.log("Fetching user details for ID:", user.id);
      const response = await userService.getUserById(user.id);

      if (response && response.data) {
        const apiUserData = response.data;
        console.log("API returned user data:", apiUserData);

        // Avoid updating the user context here - that's causing the loop
        // Instead, just use the API data to update the form

        // Update form data directly from API response
        setFormData({
          firstName: apiUserData.firstName || apiUserData.first_name || "",
          lastName: apiUserData.lastName || apiUserData.last_name || "",
          username: apiUserData.username || "",
          email: apiUserData.email || apiUserData.email || "",
          bio: apiUserData.bio || "",
          postalCode: apiUserData.postalCode || apiUserData.postal_code || "",
          city: apiUserData.city || "",
          country: apiUserData.country || "",
          isPublic:
            apiUserData.isPublic !== undefined
              ? apiUserData.isPublic
              : apiUserData.is_public !== undefined
                ? apiUserData.is_public
                : true,
          profileImage: null,
        });

        // Set image preview if available
        if (apiUserData.avatarUrl || apiUserData.avatar_url) {
          setImagePreview(apiUserData.avatarUrl || apiUserData.avatar_url);
        }

        // Store API user locally (includes badges totals as `badges`)
        setLocalUser(apiUserData);

        // Mark initial data as loaded
        setInitialDataLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      setError("Failed to load user data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, initialDataLoaded]); // Only depend on user and initialDataLoaded

  useEffect(() => {
    const message = localStorage.getItem("registrationMessage");
    if (message) {
      setRegistrationMessage(message);
      localStorage.removeItem("registrationMessage");
    }

    // Fetch user details only if we haven't loaded initial data yet
    if (user && !initialDataLoaded) {
      fetchUserDetails();
    }

    // Initialize form data from context if available and we haven't loaded from API yet
    if (user && !initialDataLoaded) {
      console.log("Initializing form with user data from context:", user);

      setFormData({
        firstName: user.firstName || user.first_name || "",
        lastName: user.lastName || user.last_name || "",
        username: user.username || "",
        email: user.email || "",
        bio: user.bio || "",
        city: user.city || "",
        postalCode: user.postalCode || user.postal_code || "",
        country: user.country || "",
        isPublic:
          user.is_public !== undefined
            ? user.is_public
            : user.isPublic !== undefined
              ? user.isPublic
              : true,
        profileImage: null,
      });

      // Set image preview if available
      if (user.avatar_url || user.avatarUrl) {
        setImagePreview(user.avatar_url || user.avatarUrl);
      }
    }

    const fetchTags = async () => {
      try {
        const structuredTags = await tagService.getStructuredTags();
        setTags(structuredTags);
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    const fetchUserTags = async () => {
      if (user) {
        try {
          const userTagsResponse = await userService.getUserTags(user.id);
          setSelectedTags(userTagsResponse.data.map((tag) => tag.id));
        } catch (error) {
          console.error("Error fetching user tags:", error);
        }
      }
    };

    // Badges are loaded via userService.getUserById(user.id) (totals -> user.badges)

    fetchTags();
    fetchUserTags();
  }, [user, initialDataLoaded, fetchUserDetails]); // Add initialDataLoaded and fetchUserDetails to dependencies

  // Log user changes for debugging
  useEffect(() => {
    console.log("User data changed:", user);
    // Check specifically for visibility status
    console.log("Visibility status:", {
      is_public: user?.is_public,
      isPublic: user?.isPublic,
    });
  }, [user]);

  // Reset image error state when user changes
  useEffect(() => {
    setImageError(false);
  }, [user?.avatarUrl, user?.avatar_url]);

  // Auto-fill city and country when postal code lookup returns a result
  useEffect(() => {
    if (isEditing) {
      const updates = getSuggestedUpdates();
      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [getSuggestedUpdates, isEditing]);

  const handleSelectedTagsChange = (newTags) => {
    setSelectedTags(newTags);
  };

  const handleBadgeCategoryClick = async (
    category,
    color,
    badges,
    totalCredits,
  ) => {
    setBadgeCategoryModal({
      isOpen: true,
      category,
      color,
      badges,
      totalCredits,
    });
    setBadgeModalLoading(true);

    try {
      const userId = localUser?.id ?? user?.id;
      const response = await userService.getUserBadges(userId);

      const payload =
        response?.success !== undefined
          ? response
          : response?.data?.success !== undefined
            ? response.data
            : (response?.data ?? response);

      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      const categoryAwards = rows.filter(
        (award) => award.badgeCategory === category,
      );
      setDetailedBadgeAwards(categoryAwards);
    } catch (error) {
      console.error("Error fetching detailed badge awards:", error);
      setDetailedBadgeAwards([]);
    } finally {
      setBadgeModalLoading(false);
    }
  };

  const closeBadgeCategoryModal = () => {
    setBadgeCategoryModal({
      isOpen: false,
      category: null,
      color: null,
      badges: [],
      totalCredits: 0,
    });
    setDetailedBadgeAwards([]);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    console.log(`Field "${name}" changed to:`, newValue);
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
  const handleAvatarDelete = async () => {
    if (!user) return;

    // Confirm deletion
    if (
      !window.confirm("Are you sure you want to remove your profile picture?")
    ) {
      return;
    }

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
          avatar_url: null,
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

  const handleTagsUpdate = async (newTags) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Use the newTags parameter instead of selectedTags
      await userService.updateUserTags(user.id, newTags);

      // Update Profile's state with the new tags
      setSelectedTags(newTags);

      setSuccess("Tags updated successfully");
    } catch (error) {
      console.error("Error updating user tags:", error);
      setError("Failed to update tags. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user) return;

    try {
      setDeleteLoading(true);
      setError(null);

      const result = await userService.deleteUser(user.id);

      if (result.success) {
        // Close modal and logout
        setIsDeleteModalOpen(false);
        logout();
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Error deleting profile:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to delete profile. Please try again.";
      setError(errorMessage);
      setIsDeleteModalOpen(false);
    } finally {
      setDeleteLoading(false);
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

      console.log("Starting profile update with form data:", formData);

      // Create an object to hold the updated user data
      const userData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username.trim(),
        email: formData.email,
        bio: formData.bio,
        postal_code: formData.postalCode,
        city: formData.city,
        country: formData.country,
        is_public: formData.isPublic,
      };

      // Handle image upload if a new image was selected
      let avatarUrl = null;
      if (formData.profileImage) {
        const cloudinaryData = new FormData();
        cloudinaryData.append("file", formData.profileImage);
        cloudinaryData.append(
          "upload_preset",
          import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        );

        console.log("Uploading image to Cloudinary");

        try {
          const cloudinaryResponse = await axios.post(
            `https://api.cloudinary.com/v1_1/${
              import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
            }/image/upload`,
            cloudinaryData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            },
          );

          console.log("Cloudinary response:", cloudinaryResponse.data);

          // Get and store the image URL
          if (cloudinaryResponse.data && cloudinaryResponse.data.secure_url) {
            avatarUrl = cloudinaryResponse.data.secure_url;
            userData.avatar_url = avatarUrl;

            // IMPORTANT: Update image preview immediately
            setImagePreview(avatarUrl);
          }
        } catch (cloudinaryError) {
          console.error("Error uploading to Cloudinary:", cloudinaryError);
          setError(
            "Failed to upload image. Please try a different image or try again later.",
          );
          setLoading(false);
          return;
        }
      }

      console.log("Sending API update with data:", userData);

      const response = await userService.updateUser(user.id, userData);

      console.log("Update response:", response);

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
        } catch (tagError) {
          console.error("Error updating tags:", tagError);
          // Don't fail the whole operation if tags fail
        }

        setIsEditing(false);
        setSuccess("Profile updated successfully");

        // Create updated user object with correct avatar URL
        const updatedUser = {
          ...user,
          is_public: formData.isPublic,
          isPublic: formData.isPublic,
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: formData.username.trim(),
          email: formData.email, // Include email in the updated user object
          bio: formData.bio,
          postal_code: formData.postalCode,
          city: formData.city,
          // Use the avatar URL from Cloudinary if we uploaded a new image,
          // otherwise use the response data or keep the existing avatar
          avatar_url: avatarUrl || response.data?.avatar_url || user.avatar_url,
          avatarUrl: avatarUrl || response.data?.avatar_url || user.avatarUrl,
          // Also set camelCase versions
          firstName: formData.firstName,
          lastName: formData.lastName,
          userName: formData.username,
          postalCode: formData.postalCode,
        };

        console.log("Updated user object:", updatedUser);

        // Update global context with new user data
        updateUser(updatedUser);

        // Force a local state update
        setLocalUser(updatedUser);

        // Reset form data with updated values
        setFormData((prev) => ({
          ...prev,
          firstName: updatedUser.first_name || updatedUser.firstName || "",
          lastName: updatedUser.last_name || updatedUser.lastName || "",
          username: updatedUser.username || "",
          email: updatedUser.email || "", // Keep the email in the form data
          bio: updatedUser.bio || "",
          postalCode: updatedUser.postal_code || updatedUser.postalCode || "",
          city: updatedUser.city || "",
          country: updatedUser.country || "",
          isPublic: updatedUser.is_public || updatedUser.isPublic || false,
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

  // Manual refresh for debugging purposes
  const handleManualRefresh = () => {
    setInitialDataLoaded(false); // Reset the flag to allow a new fetch
    fetchUserDetails(); // Manually trigger a refresh
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

  return (
    <div className="space-y-6">
      {registrationMessage && (
        <Alert
          type="success"
          message={registrationMessage}
          onClose={() => setRegistrationMessage("")}
        />
      )}

      {success && (
        <Alert
          type="success"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}

      <Card className="overflow-visible">
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProfileUpdate();
            }}
            className="p-6 space-y-12"
          >
            <h2 className="text-2xl font-bold">Edit Profile</h2>

            {/* Profile Picture */}
            <section className="space-y-4">
              <FormSectionDivider text="Profile Picture" icon={Camera} />

              <div className="w-full flex justify-center">
                <div className="w-full max-w-md mt-5">
                  <ImageUploader
                    currentImage={
                      imagePreview || user?.avatar_url || user?.avatarUrl
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
                      !!(imagePreview || user?.avatar_url || user?.avatarUrl) &&
                      !formData.profileImage
                    }
                    removeButtonText="Remove Current Picture"
                  />
                </div>
              </div>
            </section>

            {/* Account Information */}
            <section className="space-y-4">
              <FormSectionDivider text="Account Information" icon={KeyRound} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    3–20 characters, letters/numbers/underscore. Must be unique.
                  </p>
                </div>

                {/* Email */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Email Address</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input input-bordered w-full ${
                      formErrors.email ? "input-error" : ""
                    }`}
                    placeholder="Email Address"
                  />
                  {formErrors.email && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {formErrors.email}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </section>

            {/* Profile Details */}
            <section className="space-y-4">
              <FormSectionDivider text="Profile Details" icon={User} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Profile visibility toggle (moved up into Profile Details) */}
              <div className="form-control w-full">
                <VisibilityToggle
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  label="Profile Visibility"
                  entityType="profile"
                  visibleLabel="Visible to Everyone"
                  hiddenLabel="Private Profile"
                  showDescription={true}
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
                onClick={() => setIsEditing(false)}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="hover:bg-red-100 hover:text-red-700"
                  icon={<Trash2 size={16} />}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-base-300 -mx-4 sm:-mx-7"></div>

            {/* Temporary debug - remove after testing */}
            {console.log("User data in view mode:", user)}
            {console.log("City value:", user?.city)}
            {console.log("Postal code:", user?.postal_code || user?.postalCode)}

            <div className="flex flex-col md:flex-row md:items-start p-6">
              {/* Avatar */}
              <div className="mb-4 md:mb-0 md:mr-8 flex-shrink-0">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-32 h-32">
                    {(user.avatarUrl || user.avatar_url) && !imageError ? (
                      <img
                        src={user.avatarUrl || user.avatar_url}
                        alt="Profile"
                        className="rounded-full object-cover w-full h-full"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <span className="text-4xl">{getUserInitials(user)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-grow min-w-0">
                {/* Name */}
                <h2 className="text-3xl font-bold leading-[120%] mb-[0.2em]">
                  {user.firstName || user.first_name || ""}{" "}
                  {user.lastName || user.last_name || ""}
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

            {/* Contact & Focus Areas — fixed 4-col grid at xl */}
            {/* Contact, Focus Areas & Badges */}
            {(() => {
              const badgesByCategory = Array.isArray(displayUser?.badges)
                ? displayUser.badges.reduce((acc, badge) => {
                    const category = badge.category || "Other";
                    if (!acc[category]) {
                      acc[category] = {
                        badges: [],
                        color: badge.color,
                        totalCredits: 0,
                      };
                    }
                    acc[category].badges.push(badge);
                    acc[category].totalCredits +=
                      badge.total_credits ?? badge.totalCredits ?? 0;
                    return acc;
                  }, {})
                : {};

              const sortedCategories = Object.entries(badgesByCategory).sort(
                ([, a], [, b]) => b.totalCredits - a.totalCredits,
              );

              const bothEmpty =
                (!selectedTags || selectedTags.length === 0) &&
                sortedCategories.length === 0;

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
                        {user.postalCode || user.postal_code || user.city ? (
                          <LocationDisplay
                            postalCode={user.postal_code || user.postalCode}
                            city={user.city}
                            state={user.state}
                            country={user.country}
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
                      <div>
                        <TagsDisplaySection
                          title="Focus Areas"
                          tags={selectedTags}
                          allTags={tags}
                          emptyMessage="No focus areas added yet."
                        />
                      </div>
                      <div>
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
                          {user.postalCode || user.postal_code || user.city ? (
                            <LocationDisplay
                              postalCode={user.postal_code || user.postalCode}
                              city={user.city}
                              state={user.state}
                              country={user.country}
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
                      <div>
                        <TagsDisplaySection
                          title="Focus Areas"
                          tags={selectedTags}
                          allTags={tags}
                          emptyMessage="No focus areas added yet."
                        />
                      </div>
                      <div>
                        <div className="flex items-center mb-2">
                          <Award
                            size={18}
                            className="mr-2 text-primary flex-shrink-0"
                          />
                          <h3 className="font-medium">My Badges</h3>
                        </div>
                        {sortedCategories.length > 0 ? (
                          <div className="flex flex-wrap gap-4">
                            {sortedCategories.map(([category, data]) => (
                              <BadgeCategoryCard
                                key={category}
                                category={category}
                                color={data.color}
                                badges={data.badges}
                                totalCredits={data.totalCredits}
                                onClick={() =>
                                  handleBadgeCategoryClick(
                                    category,
                                    data.color,
                                    data.badges,
                                    data.totalCredits,
                                  )
                                }
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-base-content/60">
                            No badges earned yet.
                          </p>
                        )}
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
        isOpen={badgeCategoryModal.isOpen}
        onClose={closeBadgeCategoryModal}
        category={badgeCategoryModal.category}
        color={badgeCategoryModal.color}
        badges={badgeCategoryModal.badges}
        detailedAwards={detailedBadgeAwards}
        totalCredits={badgeCategoryModal.totalCredits}
        loading={badgeModalLoading}
      />

      {/* Delete Profile Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => !deleteLoading && setIsDeleteModalOpen(false)}
          title="Delete Profile"
          position="center"
          size="small"
          closeOnBackdrop={!deleteLoading}
          closeOnEscape={!deleteLoading}
          showCloseButton={!deleteLoading}
        >
          <div className="py-4">
            <p className="text-base-content">
              You are about to delete your profile. This action cannot be
              reversed and all data in your profile will be deleted from our
              database.
            </p>
            <p className="text-warning text-sm mt-2">
              This includes your messages, team memberships, badges, and all
              other associated data.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="errorOutline"
              onClick={handleDeleteProfile}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Profile;
