"use client";
import { useEffect, useState, useCallback } from "react";
import { updateSessionName } from "@/features/auth/session";
import {
  getInvestorProfile,
  saveInvestorProfile,
  type InvestorProfile,
} from "./profile-service";

export function useInvestorProfile() {
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void getInvestorProfile(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setProfile(value);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Мэдээллийг ачаалж чадсангүй.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);
  const change = (key: keyof InvestorProfile, value: string) => {
    setSaved(false);
    setProfile((current) => (current ? { ...current, [key]: value } : current));
  };
  const save = useCallback(async () => {
    if (!profile || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      if (!profile.fullName.trim()) throw new Error("Овог, нэрээ оруулна уу.");
      const result = await saveInvestorProfile({
        fullName: profile.fullName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });
      setProfile(result);
      updateSessionName(result.fullName);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Хадгалж чадсангүй.");
    } finally {
      setSaving(false);
    }
  }, [profile, saving]);
  return {
    profile,
    loading,
    saving,
    error,
    saved,
    change,
    save,
    reload: () => setReloadKey((key) => key + 1),
  };
}
