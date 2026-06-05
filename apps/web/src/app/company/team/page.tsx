"use client";

import { useMemo, useState } from "react";
import { TeamHero } from "./_components/TeamHero";
import { TeamCompanyNetwork } from "./_components/TeamCompanyNetwork";
import { TeamLeadershipSections } from "./_components/TeamLeadershipSections";
import { TeamOrgTree } from "./_components/TeamOrgTree";
import { EmptyState, SkeletonCard } from "./_components/TeamStates";
import { TeamToolbar } from "./_components/TeamToolbar";
import { TeamViewTab, TeamViewTabs } from "./_components/TeamViewTabs";
import {
  ALL_DEPARTMENTS,
  getMemberSearchText,
  isLeadershipMember,
  normalizeText,
} from "./_components/team-types";
import { useTeam } from "./_components/use-team";

export default function TeamPage() {
  const { members, loading } = useTeam();
  const [activeDept, setActiveDept] = useState(ALL_DEPARTMENTS);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TeamViewTab>("employees");

  const departments = useMemo(
    () =>
      Array.from(
        new Set(members.map((member) => member.department).filter(Boolean)),
      ) as string[],
    [members],
  );

  const filteredMembers = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return members.filter((member) => {
      const matchesDepartment =
        activeDept === ALL_DEPARTMENTS || member.department === activeDept;

      if (!matchesDepartment) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return getMemberSearchText(member).includes(normalizedQuery);
    });
  }, [activeDept, members, query]);

  const orgTreeMembers = useMemo(
    () => filteredMembers.filter((member) => !isLeadershipMember(member)),
    [filteredMembers],
  );

  const leadershipMembers = useMemo(
    () => filteredMembers.filter(isLeadershipMember),
    [filteredMembers],
  );

  const visibleResultCount =
    activeTab === "employees"
      ? orgTreeMembers.length
      : activeTab === "leadership"
        ? leadershipMembers.length
        : 0;

  const hasFilters = activeDept !== ALL_DEPARTMENTS || query.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <TeamHero
        loading={loading}
        membersCount={members.length}
        departmentsCount={departments.length}
      />

      {!loading && activeTab !== "network" && (
        <TeamToolbar
          departments={departments}
          activeDept={activeDept}
          query={query}
          resultCount={visibleResultCount}
          onDepartmentChange={setActiveDept}
          onQueryChange={setQuery}
        />
      )}

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <TeamViewTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === "employees" && (
              orgTreeMembers.length > 0 ? (
                <TeamOrgTree members={orgTreeMembers} />
              ) : (
                <EmptyState hasFilters={hasFilters} />
              )
            )}

            {activeTab === "network" && <TeamCompanyNetwork />}

            {activeTab === "leadership" && (
              <TeamLeadershipSections members={filteredMembers} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
