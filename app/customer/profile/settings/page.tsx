"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

const PROFANITY_LIST = ["badword1", "badword2"]; // Replace with real profanity or use a package
const MAX_NAME_LENGTH = 50;

function validateName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "Display name cannot be empty.";
  if (trimmed.length > MAX_NAME_LENGTH) return `Display name must be at most ${MAX_NAME_LENGTH} characters.`;
  // Add profanity check if needed
  return "";
}

export default function CustomerProfileSettings() {
  const { toast } = useToast();
  const router = useRouter();
  // Profile State
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  // Danger Zone State
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // Add real-time password validation state
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Real-time validation for new password
  useEffect(() => {
    if (!newPassword) {
      setNewPasswordError("");
      return;
    }
    if (newPassword.length < 8) {
      setNewPasswordError("New password must be at least 8 characters.");
    } else if (currentPassword && newPassword === currentPassword) {
      setNewPasswordError("New password cannot be the same as the current password.");
    } else {
      setNewPasswordError("");
    }
  }, [newPassword, currentPassword]);

  // Real-time validation for confirm password
  useEffect(() => {
    if (!confirmPassword) {
      setConfirmPasswordError("");
      return;
    }
    if (newPassword && confirmPassword !== newPassword) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError("");
    }
  }, [confirmPassword, newPassword]);

  // Password validation helper
  function validatePasswordInputs(currentPassword: string, newPassword: string, confirmPassword: string) {
    if (!currentPassword || !newPassword || !confirmPassword) return "All fields are required.";
    if (newPassword.length < 8) return "New password must be at least 8 characters.";
    if (newPassword === currentPassword) return "New password cannot be the same as the current password.";
    if (newPassword !== confirmPassword) return "Passwords do not match.";
    return "";
  }

  // Change password securely
  const handlePasswordChange = async () => {
    // Clear previous messages
    setPasswordError("");
    setPasswordSuccess("");

    // Inline validation
    const validation = validatePasswordInputs(currentPassword, newPassword, confirmPassword);
    if (validation) {
      setPasswordError(validation);
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message || "Failed to update password.");
      } else {
        setPasswordSuccess("Your password has been changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast({ title: "Password Changed", description: "Your password has been changed successfully.", variant: "default" });
      }
    } catch (err) {
      setPasswordError((err as any)?.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Delete account
  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    if (deleteConfirm !== "DELETE") {
      setDeleteError('You must type "DELETE" to confirm.');
      setDeleteLoading(false);
      return;
    }
    try {
      await supabase.from("profiles").delete().eq("id", profile.id);
      await supabase.auth.signOut();
      router.push("/");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Restore canChangePassword logic
  const canChangePassword =
    !!currentPassword &&
    !!newPassword &&
    !!confirmPassword &&
    !newPasswordError &&
    !confirmPasswordError &&
    !passwordLoading;

  // Restore name/profile/handlers logic
  const nameChanged = name.trim() !== originalName.trim();
  const isNameValid = !validateName(name);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 2MB.", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveName = async () => {
    setSaving(true);
    setNameError("");
    try {
      const errorMsg = validateName(name);
      if (errorMsg) {
        setNameError(errorMsg);
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim() })
        .eq("id", profile.id);
      if (error) throw error;
      setOriginalName(name.trim());
      setNameTouched(false);
      toast({ title: "Profile updated", description: "Your display name has been updated." });
      setProfile((p: any) => ({ ...p, name: name.trim() }));
    } catch (err: any) {
      setNameError(err.message || "Failed to update display name.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let newAvatarUrl = avatarUrl;
    try {
      if (avatarFile) {
        setAvatarUploading(true);
        const ext = avatarFile.name.split('.').pop();
        const filePath = `avatars/${profile.id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newAvatarUrl = publicUrlData.publicUrl;
      }
      const updateObj: Record<string, any> = {};
      if (avatarFile) updateObj.avatar_url = newAvatarUrl;
      if (nameChanged) updateObj.name = name.trim();
      if (Object.keys(updateObj).length === 0) {
        setSaving(false);
        toast({ title: "Nothing to update", description: "No changes to be saved." });
        return;
      }
      const { error } = await supabase.from("profiles").update(updateObj).eq("id", profile.id);
      if (error) throw error;
      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      setAvatarPreview("");
      setOriginalName(name.trim());
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      setProfile((p: any) => ({ ...p, name: name.trim(), avatar_url: newAvatarUrl }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setSaving(false);
      setAvatarUploading(false);
    }
  };

  const handleCancelName = () => {
    setName(originalName);
    setNameTouched(false);
    setNameError("");
  };

  // Fetch Profile Data
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, email")
          .eq("id", user.id)
          .maybeSingle();
        if (mounted && profile) {
          setProfile(profile);
          setName(profile.name || "");
          setOriginalName(profile.name || "");
          setAvatarUrl(profile.avatar_url || "");
        }
      }
      // Always unset loading, even if no user or error
      if (mounted) setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto py-10 px-2 md:px-0">
      <h1 className="text-3xl font-bold mb-6 text-center">Account Settings</h1>
      {/* Profile Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your display name and profile picture.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <Image
                src={avatarPreview || avatarUrl || "/placeholder-user.jpg"}
                alt="Profile Avatar"
                className="rounded-full object-cover border"
                fill
              />
            </div>
            <div className="flex-1 w-full">
              <label htmlFor="name" className="block text-sm font-medium mb-1">Display Name</label>
              <Input
                id="name"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setNameTouched(true);
                }}
                onBlur={() => setNameTouched(true)}
                disabled={saving}
                maxLength={MAX_NAME_LENGTH}
                className="mb-1"
                autoComplete="off"
                aria-invalid={!!nameError}
                aria-describedby="name-error"
              />
              {nameError && (
                <div id="name-error" className="text-red-600 text-xs mb-1">{nameError}</div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleCancelName} disabled={saving || !nameChanged}>
                  Cancel
                </Button>
                <Button onClick={handleSaveName} disabled={!nameChanged || !!nameError || saving || avatarUploading}>
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-primary rounded-full"></span>
                      Saving...
                    </span>
                  ) : (
                    "Save Name"
                  )}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving || avatarUploading}
                  className="w-full sm:w-auto"
                >
                  Change Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={saving || avatarUploading}
                />
                <span className="text-xs text-muted-foreground mt-2 sm:mt-0">Max size: 2MB. JPG, PNG, GIF.</span>
                <Button
                  onClick={handleSave}
                  disabled={(!avatarFile && !nameChanged) || saving || avatarUploading}
                  className="w-full sm:w-auto"
                  variant="secondary"
                >
                  {avatarUploading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-primary rounded-full"></span>
                      Uploading...
                    </span>
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Password Management */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Password Management</CardTitle>
          <CardDescription>Change your password or reset it if you forgot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md mx-auto">
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Current Password</label>
            <Input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              disabled={passwordLoading}
              autoComplete="current-password"
              aria-invalid={!!newPasswordError}
              aria-describedby="current-password-error"
            />
            <button
              type="button"
              className="absolute right-2 top-8 text-muted-foreground focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowCurrentPassword(v => !v)}
              aria-label={showCurrentPassword ? "Hide password" : "Show password"}
            >
              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <label className="block text-sm font-medium mb-1">New Password</label>
            <Input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              disabled={passwordLoading}
              autoComplete="new-password"
              aria-invalid={!!newPasswordError}
              aria-describedby="new-password-error"
            />
            <button
              type="button"
              className="absolute right-2 top-8 text-muted-foreground focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowNewPassword(v => !v)}
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {newPasswordError && (
              <div id="new-password-error" className="text-red-600 text-xs mb-1">{newPasswordError}</div>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={passwordLoading}
              autoComplete="new-password"
              aria-invalid={!!confirmPasswordError}
              aria-describedby="confirm-password-error"
            />
            <button
              type="button"
              className="absolute right-2 top-8 text-muted-foreground focus:outline-none"
              tabIndex={-1}
              onClick={() => setShowConfirmPassword(v => !v)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {confirmPasswordError && (
              <div id="confirm-password-error" className="text-red-600 text-xs mb-1">{confirmPasswordError}</div>
            )}
          </div>
          {passwordError && <div className="text-red-600 text-sm mt-1">{passwordError}</div>}
          {passwordSuccess && <div className="text-green-600 text-sm mt-1">{passwordSuccess}</div>}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <Button onClick={handlePasswordChange} disabled={!canChangePassword} className="w-full sm:w-auto">
              {passwordLoading ? "Saving..." : "Change Password"}
            </Button>
            <a href="/auth/forgot-password" className="text-blue-600 text-sm underline w-full sm:w-auto text-center">
              Forgot Password?
            </a>
          </div>
        </CardContent>
      </Card>
      {/* Account Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>Sign out of your account securely.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">
            Logout
          </Button>
        </CardContent>
      </Card>
      {/* Danger Zone */}
      <Card className="mb-8 border-red-400 bg-red-50 dark:bg-red-900/10">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone: Delete Account</CardTitle>
          <CardDescription className="text-red-700">
            This action is <b>irreversible</b>. All your data will be permanently deleted and you will be logged out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md mx-auto">
          <label className="block text-sm font-medium mb-1">
            Type <b>DELETE</b> to confirm
          </label>
          <Input
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            disabled={deleteLoading}
            className="mb-2"
          />
          {deleteError && <div className="text-red-600 text-sm mt-1">{deleteError}</div>}
          <div className="flex justify-end pt-2">
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading || deleteConfirm !== "DELETE"}>
              {deleteLoading ? "Deleting..." : "Delete Account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
