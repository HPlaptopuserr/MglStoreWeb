import { RegistrationGate } from "@/features/community-2003/CommunityMembership";
import { RegistrationForm } from "../_components/RegistrationForm";
export default function CommunityRegistrationPage({
  createNew = false,
}: {
  createNew?: boolean;
}) {
  return (
    <RegistrationGate createNew={createNew}>
      <RegistrationForm />
    </RegistrationGate>
  );
}
