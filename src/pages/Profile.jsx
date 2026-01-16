import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import PageContainer from "../components/layout/PageContainer";
import Section from "../components/layout/Section";
import Grid from "../components/layout/Grid";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import DataDisplay from "../components/common/DataDisplay";
import Alert from "../components/common/Alert";
import {
  Mail,
  MapPin,
  User,
  Edit,
  Eye,
  EyeClosed,
  Award,
  Trash2,
} from "lucide-react";
import { tagService } from "../services/tagService";
import { userService } from "../services/userService";
import BadgeCard from "../components/badges/BadgeCard";
import TagSelector from "../components/tags/TagSelector";
import TagInputV2 from "../components/tags/TagInputV2";
import TagsDisplaySection from "../components/tags/TagsDisplaySection";
import IconToggle from "../components/common/IconToggle";
import LocationDisplay from "../components/common/LocationDisplay";
import { getUserInitials } from "../utils/userHelpers";
import Modal from "../components/common/Modal";

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const [localUser, setUser] = useState(null);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [tags, setTags] = useState([]);
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

  // Add form errors state
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    bio: "",
    city: "",
    postalCode: "",
    isPublic: true,
    profileImage: null,
  });
  // Add a flag to track if initial data load has happened
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

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
          email: apiUserData.email || apiUserData.email || "",
          bio: apiUserData.bio || "",
          postalCode: apiUserData.postalCode || apiUserData.postal_code || "",
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
        email: user.email || "",
        bio: user.bio || "",
        city: user.city || "",
        postalCode: user.postalCode || user.postal_code || "",
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prevData) => ({
        ...prevData,
        profileImage: file,
      }));

      // For preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
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
        email: formData.email,
        bio: formData.bio,
        postal_code: formData.postalCode,
        city: formData.city,
        is_public: formData.isPublic,
      };

      // Handle image upload if a new image was selected
      let avatarUrl = null;
      if (formData.profileImage) {
        const cloudinaryData = new FormData();
        cloudinaryData.append("file", formData.profileImage);
        cloudinaryData.append(
          "upload_preset",
          import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
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
            }
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
            "Failed to upload image. Please try a different image or try again later."
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
          response?.message || "No response received"
        );
        setError(
          "Failed to update profile: " + (response?.message || "Unknown error")
        );
      } else {
        setIsEditing(false);
        setSuccess("Profile updated successfully");

        // Create updated user object with correct avatar URL
        const updatedUser = {
          ...user,
          is_public: formData.isPublic,
          isPublic: formData.isPublic,
          first_name: formData.firstName,
          last_name: formData.lastName,
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
          postalCode: formData.postalCode,
        };

        console.log("Updated user object:", updatedUser);

        // Update global context with new user data
        updateUser(updatedUser);

        // Force a local state update
        setUser(updatedUser);

        // Reset form data with updated values
        setFormData((prev) => ({
          ...prev,
          firstName: updatedUser.first_name || updatedUser.firstName || "",
          lastName: updatedUser.last_name || updatedUser.lastName || "",
          email: updatedUser.email || "", // Keep the email in the form data
          bio: updatedUser.bio || "",
          postalCode: updatedUser.postal_code || updatedUser.postalCode || "",
          isPublic: updatedUser.is_public || updatedUser.isPublic || false,
          profileImage: null, // Reset profile image after successful update
        }));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError(
        "Failed to update profile: " + (error.message || "Unknown error")
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

  if (!user) {
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
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

            <div className="mb-6 flex justify-top">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-24 h-24 relative">
                  {imagePreview && !imageError ? (
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="rounded-full object-cover w-full h-full"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <span className="text-3xl">{getUserInitials(user)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Profile Image</span>
              </label>
              <input
                type="file"
                className="file-input file-input-bordered w-full"
                onChange={handleImageChange}
                accept="image/*"
              />
            </div>

            <div className="form-control w-full mb-4">
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

            <div className="form-control w-full mb-4">
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

            <div className="form-control w-full mb-4">
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

            <div className="form-control w-full mb-4">
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

            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Postal Code</span>
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="Postal Code"
              />
            </div>

            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">City / Town</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="e.g. Berlin, London, New York"
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  Optional - if left empty, city will be derived from postal
                  code
                </span>
              </label>
            </div>

            {/* Profile visibility toggle */}
            <div className="form-control w-full mb-6">
              <IconToggle
                name="isPublic"
                checked={formData.isPublic}
                onChange={handleChange}
                title="Profile Visibility"
                entityType="profile"
                visibleLabel="Visible to Everyone"
                hiddenLabel="Private Profile"
                visibleDescription="Your profile will be discoverable by other users"
                hiddenDescription="Your profile will be hidden from search results"
                className="toggle-visibility"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleProfileUpdate}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {/* Temporary debug - remove after testing */}
            {console.log("User data in view mode:", user)}
            {console.log("City value:", user?.city)}
            {console.log("Postal code:", user?.postal_code || user?.postalCode)}
            <div className="flex flex-col md:flex-row md:items-top p-6">
              <div className="mb-6 md:mb-0 md:mr-8">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-24 h-24">
                    {(user.avatarUrl || user.avatar_url) && !imageError ? (
                      <img
                        src={user.avatarUrl || user.avatar_url}
                        alt="Profile"
                        className="rounded-full object-cover w-full h-full"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <span className="text-3xl">{getUserInitials(user)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-grow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold leading-[120%] mb-[0.2em]">
                      {user.firstName || user.first_name || ""}{" "}
                      {user.lastName || user.last_name || ""}
                    </h2>

                    {/* Username and visibility status inline - matching UserDetailsModal layout */}
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-base-content/70">
                        @{user.username}
                      </span>
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
                            <Eye size={16} className="mr-1 text-green-600" />
                            <span>Public</span>
                          </>
                        ) : (
                          <>
                            <EyeClosed
                              size={16}
                              className="mr-1 text-gray-500"
                            />
                            <span>Private</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      icon={<Edit size={16} />}
                    >
                      Edit Profile
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDeleteModalOpen(true)}
                      icon={<Trash2 size={16} />}
                      className="text-error hover:bg-error/10"
                    >
                      Delete Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            {user.bio && (
              <div className="px-6">
                <p className="text-base-content/90">{user.bio}</p>
              </div>
            )}

            {/* Contact & Info Section */}
            <div className="px-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Email */}
                <div>
                  <div className="flex items-center mb-2">
                    <Mail
                      size={18}
                      className="mr-2 text-primary flex-shrink-0"
                    />
                    <h3 className="font-medium">Email</h3>
                  </div>
                  <p className="text-base-content/80">{user.email}</p>
                </div>

                {/* Location */}
                {(user.postalCode || user.postal_code || user.city) && (
                  <div>
                    <div className="flex items-center mb-2">
                      <MapPin
                        size={18}
                        className="mr-2 text-primary flex-shrink-0"
                      />
                      <h3 className="font-medium">Location</h3>
                    </div>
                    <LocationDisplay
                      postalCode={user.postal_code || user.postalCode}
                      city={user.city}
                      className="bg-base-200/50 py-1"
                      showIcon={false}
                      showPostalCode={true}
                      displayType="detailed"
                    />
                  </div>
                )}

                {/* Member Since */}
                <div>
                  <div className="flex items-center mb-2">
                    <User
                      size={18}
                      className="mr-2 text-primary flex-shrink-0"
                    />
                    <h3 className="font-medium">Member Since</h3>
                  </div>
                  <p className="text-base-content/80">April 2025</p>
                </div>
              </div>
            </div>

            {/* Focus Areas - already using consistent TagsDisplaySection */}
            <div className="px-6 mt-6">
              <TagsDisplaySection
                title="Focus Areas"
                tags={selectedTags}
                allTags={tags}
                onSave={handleTagsUpdate}
                canEdit={true}
                emptyMessage="No focus areas added yet."
              />
            </div>

            {/* Badges Section */}
            <div className="px-6 mt-6 pb-6">
              <div className="flex items-center mb-4">
                <Award size={18} className="mr-2 text-primary flex-shrink-0" />
                <h3 className="font-medium">My Badges</h3>
              </div>
              {tags.filter((tag) => tag.type === "badge").length > 0 ? (
                <Grid cols={2} md={3} lg={4} gap={4}>
                  {tags.map(
                    (tag) =>
                      tag.type === "badge" && (
                        <BadgeCard key={tag.id} badge={tag} />
                      )
                  )}
                </Grid>
              ) : (
                <span className="badge badge-warning">
                  No badges earned yet.
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

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
