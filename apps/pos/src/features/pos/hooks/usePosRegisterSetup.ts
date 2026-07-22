"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchBranches,
  fetchOrgRegisters,
  fetchRegisterConfig,
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

  useEffect(() => {
    if (!posEnabled) return;

    const registerId = localStorage.getItem(POS_REGISTER_ID_KEY);
    if (!registerId) return;

    fetchRegisterConfig(registerId)
      .then(setRegisterConfig)
      .catch(() => {
        localStorage.removeItem(POS_REGISTER_ID_KEY);
        setRegisterConfig(null);
      });
  }, [posEnabled]);

  useEffect(() => {
    if (!posEnabled || registerConfig || !organizationId) return;

    fetchOrgRegisters()
      .then((list) => {
        if (!Array.isArray(list) || list.length === 0) return;
        if (list.length === 1) {
          localStorage.setItem(POS_REGISTER_ID_KEY, list[0].id);
          setRegisterConfig(list[0]);
          return;
        }

        setOrgRegisters(list);
        setShowRegisterPicker(true);
      })
      .catch(() => {
        setOrgRegisters([]);
      });
  }, [organizationId, posEnabled, registerConfig]);

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
      localStorage.setItem(POS_REGISTER_ID_KEY, created.id);
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
  }, [organizationId, setupBranchId, setupName]);

  const handleConnectExisting = useCallback(() => {
    const id = setupExistingId.trim();
    if (!id) return;

    setSetupRegistering(true);
    setSetupError("");
    localStorage.setItem(POS_REGISTER_ID_KEY, id);
    fetchRegisterConfig(id)
      .then((config) => {
        setRegisterConfig(config);
        setShowSetupPanel(false);
        setSetupExistingId("");
      })
      .catch(() => {
        localStorage.removeItem(POS_REGISTER_ID_KEY);
        setSetupError("Register ID олдсонгүй эсвэл идэвхгүй байна.");
      })
      .finally(() => setSetupRegistering(false));
  }, [setupExistingId]);

  const handleDisconnectRegister = useCallback(() => {
    localStorage.removeItem(POS_REGISTER_ID_KEY);
    setRegisterConfig(null);
    setShowSetupPanel(false);
    setSetupError("");
  }, []);

  const selectRegister = useCallback((register: RegisterConfig) => {
    localStorage.setItem(POS_REGISTER_ID_KEY, register.id);
    setRegisterConfig(register);
    setShowRegisterPicker(false);
  }, []);

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
