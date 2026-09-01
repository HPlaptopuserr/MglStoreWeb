"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchBranches,
  fetchOrgRegisters,
  fetchRegisterConfig,
  getPosRegisterIdKey,
  POS_REGISTER_ID_KEY,
  selfClaimRegister,
  type Branch,
  type RegisterConfig,
} from "../api/register";

type SetupTab = "new" | "existing";

type Options = {
  organizationId: string;
  posEnabled: boolean;
};

export function usePosRegisterSetup({ organizationId, posEnabled }: Options) {
  const [registerConfig, setRegisterConfig] = useState<RegisterConfig | null>(
    null,
  );
  const [orgRegisters, setOrgRegisters] = useState<RegisterConfig[]>([]);
  const [showRegisterPicker, setShowRegisterPicker] = useState(false);
  const [showSetupPanel, setShowSetupPanel] = useState(false);
  const [setupTab, setSetupTab] = useState<SetupTab>("new");
  const [setupName, setSetupName] = useState("");
  const [setupBranches, setSetupBranches] = useState<Branch[]>([]);
  const [setupBranchId, setSetupBranchId] = useState("");
  const [setupRegistering, setSetupRegistering] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupExistingId, setSetupExistingId] = useState("");
  const registerStorageKey = getPosRegisterIdKey(organizationId);

  useEffect(() => {
    setOrgRegisters([]);
    setShowRegisterPicker(false);
    if (!posEnabled || !organizationId) {
      setRegisterConfig(null);
      return;
    }

    let cancelled = false;
    setRegisterConfig((current) =>
      current?.organizationId === organizationId ? current : null,
    );

    const registerId =
      localStorage.getItem(registerStorageKey) ||
      localStorage.getItem(POS_REGISTER_ID_KEY);
    if (!registerId) return;

    fetchRegisterConfig(registerId)
      .then((config) => {
        if (config.organizationId !== organizationId) {
          throw new Error("POS register байгууллага зөрүүтэй байна");
        }
        if (cancelled) return;
        localStorage.setItem(registerStorageKey, config.id);
        localStorage.removeItem(POS_REGISTER_ID_KEY);
        setRegisterConfig(config);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem(registerStorageKey);
        localStorage.removeItem(POS_REGISTER_ID_KEY);
        setRegisterConfig(null);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, posEnabled, registerStorageKey]);

  useEffect(() => {
    if (!posEnabled || registerConfig || !organizationId) return;

    fetchOrgRegisters()
      .then((list) => {
        const ownRegisters = Array.isArray(list)
          ? list.filter((register) => register.organizationId === organizationId)
          : [];
        if (ownRegisters.length === 0) return;
        if (ownRegisters.length === 1) {
          localStorage.setItem(registerStorageKey, ownRegisters[0].id);
          localStorage.removeItem(POS_REGISTER_ID_KEY);
          setRegisterConfig(ownRegisters[0]);
          return;
        }

        setOrgRegisters(ownRegisters);
        setShowRegisterPicker(true);
      })
      .catch(() => {
        setOrgRegisters([]);
      });
  }, [organizationId, posEnabled, registerConfig, registerStorageKey]);

  useEffect(() => {
    if (!showSetupPanel || !organizationId) return;

    fetchBranches(organizationId)
      .then((branches) => {
        setSetupBranches(branches);
        if (branches.length > 0 && !setupBranchId) {
          setSetupBranchId(branches[0].id);
        }
      })
      .catch(() => {
        setSetupBranches([]);
      });
  }, [organizationId, setupBranchId, showSetupPanel]);

  const handleSelfRegister = useCallback(async () => {
    if (!setupName.trim() || !setupBranchId) {
      setSetupError("Нэр болон салбараа сонгоно уу.");
      return;
    }

    setSetupRegistering(true);
    setSetupError("");
    try {
      const created = await selfClaimRegister({
        organizationId,
        branchId: setupBranchId,
        name: setupName.trim(),
      });
      localStorage.setItem(registerStorageKey, created.id);
      localStorage.removeItem(POS_REGISTER_ID_KEY);
      setRegisterConfig(created);
      setShowSetupPanel(false);
      setSetupName("");
    } catch (error) {
      setSetupError(
        error instanceof Error
          ? error.message
          : "Сервертэй холбогдоход алдаа гарлаа.",
      );
    } finally {
      setSetupRegistering(false);
    }
  }, [organizationId, registerStorageKey, setupBranchId, setupName]);

  const handleConnectExisting = useCallback(() => {
    const id = setupExistingId.trim();
    if (!id) return;

    setSetupRegistering(true);
    setSetupError("");
    fetchRegisterConfig(id)
      .then((config) => {
        if (config.organizationId !== organizationId) {
          throw new Error("Өөр байгууллагын POS register холбох боломжгүй");
        }
        localStorage.setItem(registerStorageKey, config.id);
        localStorage.removeItem(POS_REGISTER_ID_KEY);
        setRegisterConfig(config);
        setShowSetupPanel(false);
        setSetupExistingId("");
      })
      .catch(() => {
        localStorage.removeItem(registerStorageKey);
        setSetupError("Register ID олдсонгүй эсвэл идэвхгүй байна.");
      })
      .finally(() => setSetupRegistering(false));
  }, [organizationId, registerStorageKey, setupExistingId]);

  const handleDisconnectRegister = useCallback(() => {
    localStorage.removeItem(registerStorageKey);
    localStorage.removeItem(POS_REGISTER_ID_KEY);
    setRegisterConfig(null);
    setShowSetupPanel(false);
    setSetupError("");
  }, [registerStorageKey]);

  const selectRegister = useCallback(
    (register: RegisterConfig) => {
      if (register.organizationId !== organizationId) return;
      localStorage.setItem(registerStorageKey, register.id);
      localStorage.removeItem(POS_REGISTER_ID_KEY);
      setRegisterConfig(register);
      setShowRegisterPicker(false);
    },
    [organizationId, registerStorageKey],
  );

  return {
    registerConfig,
    setRegisterConfig,
    orgRegisters,
    showRegisterPicker,
    setShowRegisterPicker,
    showSetupPanel,
    setShowSetupPanel,
    setupTab,
    setSetupTab,
    setupName,
    setSetupName,
    setupBranches,
    setupBranchId,
    setSetupBranchId,
    setupRegistering,
    setupError,
    setSetupError,
    setupExistingId,
    setSetupExistingId,
    handleSelfRegister,
    handleConnectExisting,
    handleDisconnectRegister,
    selectRegister,
  };
}
