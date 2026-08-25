import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useTheme } from "../theme/ThemeContext";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = `${import.meta.env.VITE_SERVER_URL || "http://localhost:3001"}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default function SettingsModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, logout, refetch } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState({ username: "", email: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setProfileData({ username: user.username, email: user.email });
    }
  }, [isOpen, user]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await api.patch("/auth/me", { username: profileData.username });
      toast.success("Profile updated");
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    const confirmText = "DELETE MY ACCOUNT";
    const userInput = window.prompt(
      `This will permanently delete your account and all your notes. This action cannot be undone.\n\nType "${confirmText}" to confirm:`
    );
    if (userInput !== confirmText) return;

    setDeletingAccount(true);
    try {
      await api.delete("/auth/me");
      toast.success("Account deleted");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account");
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "profile", label: "Profile", icon: "person" },
    { id: "appearance", label: "Appearance", icon: "palette" },
    { id: "account", label: "Account", icon: "account_circle" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close settings">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <p className="settings-subtitle">Manage your profile, appearance, and account</p>
        </div>

        <div className="settings-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-panels">
          <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab" className={`settings-panel ${activeTab === "profile" ? "active" : ""}`}>
            <form onSubmit={handleProfileSave} className="settings-form">
              <h3>Profile</h3>
              <div className="form-group">
                <label htmlFor="settings-username">Username</label>
                <input
                  id="settings-username"
                  type="text"
                  className="input-box"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  required
                  minLength={2}
                  maxLength={30}
                />
              </div>
              <div className="form-group">
                <label htmlFor="settings-email">Email</label>
                <input
                  id="settings-email"
                  type="email"
                  className="input-box"
                  value={profileData.email}
                  disabled
                  required
                />
                <p className="form-hint">Email cannot be changed</p>
              </div>
              <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>

          <div role="tabpanel" id="appearance-panel" aria-labelledby="appearance-tab" className={`settings-panel ${activeTab === "appearance" ? "active" : ""}`}>
            <div className="settings-section">
              <h3>Theme</h3>
              <p className="section-description">Choose your preferred color scheme</p>
              <div className="theme-options" role="radiogroup" aria-label="Theme selection">
                {[
                  { value: "system", label: "System", description: "Matches your OS setting", icon: "computer" },
                  { value: "light", label: "Light", description: "Always use light mode", icon: "light_mode" },
                  { value: "dark", label: "Dark", description: "Always use dark mode", icon: "dark_mode" },
                ].map((option) => (
                  <button
                    key={option.value}
                    role="radio"
                    aria-checked={theme === option.value}
                    className={`theme-option ${theme === option.value ? "selected" : ""}`}
                    onClick={() => handleThemeChange(option.value)}
                  >
                    <span className="material-symbols-outlined">{option.icon}</span>
                    <div className="theme-option-info">
                      <span className="theme-option-label">{option.label}</span>
                      <span className="theme-option-description">{option.description}</span>
                    </div>
                    {theme === option.value && <span className="material-symbols-outlined theme-check">check_circle</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div role="tabpanel" id="account-panel" aria-labelledby="account-tab" className={`settings-panel ${activeTab === "account" ? "active" : ""}`}>
            <div className="settings-section">
              <h3>Session</h3>
              <button className="btn btn-secondary" onClick={handleLogout}>
                <span className="material-symbols-outlined">logout</span>
                Logout
              </button>
            </div>

            <div className="danger-zone">
              <h3>Danger Zone</h3>
              <div className="danger-item">
                <div className="danger-info">
                  <h4>Delete Account</h4>
                  <p>Permanently delete your account and all your notes. This action is irreversible.</p>
                </div>
                <button
                  className="btn btn-ghost danger"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                >
                  {deletingAccount ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}