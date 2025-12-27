import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import TagInputV2 from "../tags/TagInputV2";
import Card from "../common/Card";
import Button from "../common/Button";
import FormGroup from "../common/FormGroup";
import { Tag } from "lucide-react";

const RegisterForm = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    bio: "",
    postal_code: "",
    profile_image: null,
    selectedTags: [],
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) {
      newErrors.username = "Username is required";
    }
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm Password is required";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        profile_image: file,
      });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagsChange = (newTags) => {
    setFormData({
      ...formData,
      selectedTags: newTags,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name || "",
        last_name: formData.last_name || "",
        bio: formData.bio || "",
        postal_code: formData.postal_code || "",
        // Backend only expects tag_id (experience_level and interest_level are commented out in schema)
        tags:
          formData.selectedTags.length > 0
            ? formData.selectedTags.map((tagId) => ({
                tag_id: Number(tagId),
              }))
            : [],
      };

      if (formData.profile_image) {
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append("file", formData.profile_image);
        cloudinaryFormData.append(
          "upload_preset",
          import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
        );

        const cloudinaryResponse = await axios.post(
          `https://api.cloudinary.com/v1_1/${
            import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
          }/image/upload`,
          cloudinaryFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        userData.avatar_url = cloudinaryResponse.data.secure_url;
      }

      const result = await register(userData);

      if (result.success) {
        localStorage.setItem(
          "registrationMessage",
          "Profile created successfully!"
        );
        navigate("/profile");
      } else {
        setErrors((prev) => ({
          ...prev,
          form: result.message,
        }));
      }
    } catch (error) {
      console.error("Full Registration error:", error);
      setErrors((prev) => ({
        ...prev,
        form: error.response?.data?.message || "Registration failed.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="w-full">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center justify-center mb-2">
            Create Account
          </h2>
          <p className="text-center text-base-content/70 mb-4">
            Join Lomir and start building teams
          </p>

          {errors.form && (
            <div className="alert alert-error mb-4">
              <span>{errors.form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Information Section */}
            <div className="divider text-sm text-base-content/60">
              Account Information
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  Username <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                placeholder="Choose a username"
                className={`input input-bordered w-full ${
                  errors.username ? "input-error" : ""
                }`}
                value={formData.username}
                onChange={handleChange}
                name="username"
              />
              {errors.username && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.username}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  Email <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                className={`input input-bordered w-full ${
                  errors.email ? "input-error" : ""
                }`}
                value={formData.email}
                onChange={handleChange}
                name="email"
              />
              {errors.email && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.email}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  Password <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className={`input input-bordered w-full ${
                  errors.password ? "input-error" : ""
                }`}
                value={formData.password}
                onChange={handleChange}
                name="password"
              />
              {errors.password && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.password}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  Confirm Password <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className={`input input-bordered w-full ${
                  errors.confirmPassword ? "input-error" : ""
                }`}
                value={formData.confirmPassword}
                onChange={handleChange}
                name="confirmPassword"
              />
              {errors.confirmPassword && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.confirmPassword}
                  </span>
                </label>
              )}
            </div>

            {/* Profile Details Section */}
            <div className="divider text-sm text-base-content/60">
              Profile Details
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">First Name</span>
                </label>
                <input
                  type="text"
                  placeholder="First Name"
                  className="input input-bordered w-full"
                  value={formData.first_name}
                  onChange={handleChange}
                  name="first_name"
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Last Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Last Name"
                  className="input input-bordered w-full"
                  value={formData.last_name}
                  onChange={handleChange}
                  name="last_name"
                />
              </div>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Bio</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Tell us a bit about yourself..."
                value={formData.bio}
                onChange={handleChange}
                name="bio"
                rows="3"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Postal Code</span>
              </label>
              <input
                type="text"
                placeholder="e.g., 12345"
                className="input input-bordered w-full"
                value={formData.postal_code}
                onChange={handleChange}
                name="postal_code"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Profile Image</span>
              </label>
              <div className="flex items-center gap-4">
                {imagePreview && (
                  <div className="avatar">
                    <div className="w-16 h-16 rounded-full">
                      <img src={imagePreview} alt="Preview" />
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  className="file-input file-input-bordered w-full"
                  onChange={handleImageChange}
                  accept="image/*"
                  name="profile_image"
                />
              </div>
            </div>

            {/* Skills & Interests Section */}
            <div className="divider text-sm text-base-content/60">
              Skills & Interests
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <Tag size={16} className="text-primary" />
                  Add your skills and interests
                </span>
              </label>
              <TagInputV2
                selectedTags={formData.selectedTags}
                onTagsChange={handleTagsChange}
                placeholder="Type to search tags..."
                showPopularTags={true}
                maxSuggestions={8}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  You can add or edit tags later in your profile
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
              className="mt-6"
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="divider my-6">OR</div>

          <div className="text-center">
            <p className="mb-2">Already have an account?</p>
            <Link to="/login" className="link link-primary">
              Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RegisterForm;
