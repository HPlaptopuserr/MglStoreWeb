type ShiftScopeActor = {
  id: string;
  organizationId: string | null;
};

export function buildCurrentShiftScope(actor: ShiftScopeActor) {
  return {
    cashierId: actor.id,
    ...(actor.organizationId
      ? { organizationId: actor.organizationId }
      : {}),
  };
}

export function buildOpenShiftConflictScopes(
  cashierId: string,
  organizationId: string,
  registerId: string | null,
  mode: "RETAIL" | "RESTAURANT",
) {
  return [
    {
      cashierId,
      organizationId,
      mode,
    },
    ...(registerId ? [{ registerId }] : []),
  ];
}
