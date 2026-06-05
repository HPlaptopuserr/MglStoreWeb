import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { TeamMember } from "./team-types";
import { MOCK_TEAM_MEMBERS } from "./team-mock-data";

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch(`${API}/team`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (mounted) {
          const teamMembers = Array.isArray(data) ? data : [];
          setMembers(teamMembers.length > 0 ? teamMembers : MOCK_TEAM_MEMBERS);
        }
      })
      .catch(() => {
        if (mounted) {
          setMembers(MOCK_TEAM_MEMBERS);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { members, loading };
}
