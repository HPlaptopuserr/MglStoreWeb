import type { VendorLoginMember } from "./vendor-login-types";

export function canBecomeVendorOwner(member: VendorLoginMember): boolean {
  return (
    member.role !== "OWNER" &&
    member.memberActive !== false &&
    member.isActive !== false
  );
}
