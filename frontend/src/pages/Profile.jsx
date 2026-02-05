// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, fetchProfile } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Load profile once when the page mounts
  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        await fetchProfile();
      } catch (err) {
        console.error("Failed to load profile:", err);
        setProfileError("Could not load your profile details.");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      await fetchProfile();
    } catch (err) {
      console.error("Failed to refresh profile:", err);
      setProfileError("Could not refresh your profile details.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const displayName = user?.fullName || user?.full_name || user?.name || "Customer";
  const email = user?.email || "Not available";
  const role = user?.role || "CUSTOMER";

  return (
    <div className="flex min-h-[60vh] items-start justify-center">
      <div className="w-full max-w-xl rounded-lg border border-gray-200 bg-white px-8 py-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
              <Icon icon="mdi:account-circle-outline" className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-wide text-gray-800">My Profile</h1>
              <p className="text-xs text-gray-500">Your account details at a glance.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loadingProfile}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            {loadingProfile ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400/40 border-t-gray-600" />
                Refreshing...
              </>
            ) : (
              <>
                <Icon icon="mdi:refresh" className="h-4 w-4" />
                Refresh
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {profileError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {profileError}
          </div>
        )}

        {/* Profile details */}
        <div className="space-y-4">
          <div>
            <h2 className="mb-1 text-sm font-semibold text-gray-700">Account information</h2>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
              <div className="mb-2 flex items-center gap-2">
                <Icon icon="mdi:account-outline" className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{displayName}</span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <Icon icon="mdi:email-outline" className="h-4 w-4 text-gray-500" />
                <span>{email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon icon="mdi:shield-account-outline" className="h-4 w-4 text-gray-500" />
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  {role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
