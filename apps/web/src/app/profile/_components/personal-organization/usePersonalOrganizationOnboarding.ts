"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { InviteeUser, PersonalOrganizationOverview } from "./types";
import {
  checkOrganizationNameAvailability,
  createPersonalOrganization,
  fetchPersonalOrganizationOverview,
  respondToPersonalOrganizationInvitation,
  searchInviteeUsers,
  type AuthFetch,
} from "./personalOrganizationApi";
import {
  normalizeOrganizationName,
  validateBusinessCategory,
  validateOrganizationName,
} from "./validation";

export type PersonalOrganizationFormErrors = {
  organizationName?: string;
  businessCategory?: string;
  invitee?: string;
};

const initialOverview: PersonalOrganizationOverview = {
  ownedPending: [],
  invitations: [],
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function inviteeLabel(user: InviteeUser | null) {
  if (!user) return "";
  return user.email || user.phone || user.fullName;
}

export function usePersonalOrganizationOnboarding({
  authFetch,
  onActivated,
}: {
  authFetch: AuthFetch;
  onActivated: () => Promise<void>;
}) {
  const [overview, setOverview] = useState<PersonalOrganizationOverview>(initialOverview);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [inviteeQuery, setInviteeQuery] = useState("");
  const [inviteeUsers, setInviteeUsers] = useState<InviteeUser[]>([]);
  const [selectedInvitee, setSelectedInvitee] = useState<InviteeUser | null>(null);
  const [inviteeLoading, setInviteeLoading] = useState(false);
  const [inviteeError, setInviteeError] = useState("");
  const [errors, setErrors] = useState<PersonalOrganizationFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState("");
  const [nameChecking, setNameChecking] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);

  const hasPending = overview.ownedPending.length > 0;

  const loadOverview = useCallback(async () => {
    setOverviewError("");
    setOverviewLoading(true);
    try {
      setOverview(await fetchPersonalOrganizationOverview(authFetch));
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : "Алдаа гарлаа.");
    } finally {
      setOverviewLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const nameError = validateOrganizationName(organizationName);
    const normalized = normalizeOrganizationName(organizationName);
    setNameAvailable(null);

    if (nameError || normalized.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setNameChecking(true);
      try {
        const available = await checkOrganizationNameAvailability(
          authFetch,
          normalized,
          controller.signal,
        );
        setErrors((current) => ({ ...current, organizationName: "" }));
        setNameAvailable(available);
      } catch (error) {
        if (!isAbortError(error)) {
          setErrors((current) => ({
            ...current,
            organizationName:
              error instanceof Error
                ? error.message
                : "Энэ нэртэй байгууллага аль хэдийн бүртгэлтэй байна.",
          }));
          setNameAvailable(false);
        }
      } finally {
        setNameChecking(false);
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [authFetch, organizationName]);

  useEffect(() => {
    const query = inviteeQuery.trim();
    setInviteeUsers([]);
    setInviteeError("");

    if (query.length < 3 || query === inviteeLabel(selectedInvitee)) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setInviteeLoading(true);
      try {
        setInviteeUsers(await searchInviteeUsers(authFetch, query, controller.signal));
      } catch (error) {
        if (!isAbortError(error)) {
          setInviteeError(
            error instanceof Error ? error.message : "Хэрэглэгч хайхад алдаа гарлаа.",
          );
        }
      } finally {
        setInviteeLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [authFetch, inviteeQuery, selectedInvitee]);

  const formValid = useMemo(
    () =>
      !validateOrganizationName(organizationName) &&
      !validateBusinessCategory(businessCategory) &&
      Boolean(selectedInvitee) &&
      nameAvailable !== false,
    [businessCategory, nameAvailable, organizationName, selectedInvitee],
  );

  const selectInvitee = useCallback((user: InviteeUser) => {
    setSelectedInvitee(user);
    setInviteeQuery(inviteeLabel(user));
    setInviteeUsers([]);
    setErrors((current) => ({ ...current, invitee: "" }));
  }, []);

  const changeInviteeQuery = useCallback((value: string) => {
    setInviteeQuery(value);
    setSelectedInvitee(null);
  }, []);

  const resetForm = useCallback(() => {
    setOrganizationName("");
    setBusinessCategory("");
    setInviteeQuery("");
    setSelectedInvitee(null);
    setInviteeUsers([]);
    setErrors({});
    setNameAvailable(null);
  }, []);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitError("");
      setSuccess("");

      const nextErrors: PersonalOrganizationFormErrors = {
        organizationName: validateOrganizationName(organizationName),
        businessCategory: validateBusinessCategory(businessCategory),
        invitee: selectedInvitee ? "" : "Баталгаажуулах хоёр дахь хүнийг сонгоно уу.",
      };
      setErrors(nextErrors);
      if (Object.values(nextErrors).some(Boolean) || !selectedInvitee) return;

      setSubmitting(true);
      try {
        await createPersonalOrganization(authFetch, {
          organizationName,
          businessCategory,
          inviteeUserId: selectedInvitee.id,
        });
        setSuccess("Байгууллага pending төлөвтэй үүслээ. Уригдсан хүн баталсны дараа active болно.");
        resetForm();
        await loadOverview();
        await onActivated();
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Байгууллага үүсгэхэд алдаа гарлаа.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      authFetch,
      businessCategory,
      loadOverview,
      onActivated,
      organizationName,
      resetForm,
      selectedInvitee,
    ],
  );

  const respondToInvitation = useCallback(
    async (id: string, action: "approve" | "reject") => {
      setRespondingId(id);
      setSubmitError("");
      setSuccess("");
      try {
        await respondToPersonalOrganizationInvitation(authFetch, id, action);
        setSuccess(action === "approve" ? "Байгууллага active боллоо." : "Хүсэлтийг татгалзлаа.");
        await Promise.all([loadOverview(), onActivated()]);
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Хүсэлт шийдвэрлэхэд алдаа гарлаа.",
        );
      } finally {
        setRespondingId("");
      }
    },
    [authFetch, loadOverview, onActivated],
  );

  return {
    businessCategory,
    changeInviteeQuery,
    errors,
    formValid,
    hasPending,
    inviteeError,
    inviteeLoading,
    inviteeQuery,
    inviteeUsers,
    nameAvailable,
    nameChecking,
    organizationName,
    overview,
    overviewError,
    overviewLoading,
    respondingId,
    respondToInvitation,
    selectedInvitee,
    selectInvitee,
    setBusinessCategory,
    setOrganizationName,
    submit,
    submitError,
    submitting,
    success,
  };
}
