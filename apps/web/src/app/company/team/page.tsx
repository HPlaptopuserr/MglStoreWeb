"use client";

import { useMemo, useState } from "react";
import { getInvestorTierLabel } from "@mgl/types";
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
  TeamInvestor,
  TeamMember,
} from "./_components/team-types";
import { useTeam } from "./_components/use-team";

function investorToMember(investor: TeamInvestor, index: number): TeamMember {
  return {
    id: `investor-${investor.id}`,
    name: investor.name,
    role: investor.tierLabel || getInvestorTierLabel(investor.tier),
    department: "Хөрөнгө оруулагчид",
    bio: investor.description,
    avatarUrl: investor.logoUrl,
    email: null,
    linkedinUrl: null,
    experience: investor.investmentLevel ? `${investor.investmentLevel}` : getInvestorTierLabel(investor.tier),
    skills: ["Хөрөнгө оруулагч", getInvestorTierLabel(investor.tier), "Түнш"].filter(Boolean),
    order: 2000 + index,
  };
}

export default function TeamPage() {
  const {
    members,
    investors,
    networkCompanies,
    companyInfo,
    companyNodes,
    departmentConnections,
    departmentOrder,
    orgLayout,
    loading,
  } = useTeam();
  const [activeDept, setActiveDept] = useState(ALL_DEPARTMENTS);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TeamViewTab>("employees");

  const departments = useMemo(
    () =>
      Array.from(
        new Set(members.map((member) => member.department).filter(Boolean)),
      ).sort((a, b) => {
        const left = departmentOrder.indexOf(a as string);
        const right = departmentOrder.indexOf(b as string);
        if (left === -1 && right === -1) return 0;
        if (left === -1) return 1;
        if (right === -1) return -1;
        return left - right;
      }) as string[],
    [departmentOrder, members],
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
    () => {
      const nonInvestorLeadership = filteredMembers.filter(
        (member) =>
          isLeadershipMember(member) &&
          !getMemberSearchText(member).includes("хөрөнгө") &&
          !getMemberSearchText(member).includes("investor"),
      );

      const investorMembers = investors.map(investorToMember);
      return [...nonInvestorLeadership, ...investorMembers];
    },
    [filteredMembers, investors],
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

      <section className="px-4 py-10 sm:px-6 sm:py-14">
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
                <TeamOrgTree
                  members={orgTreeMembers}
                  companyInfo={companyInfo}
                  companyNodes={companyNodes}
                  departmentConnections={departmentConnections}
                  departmentOrder={departmentOrder}
                  layout={orgLayout}
                />
              ) : (
                <EmptyState hasFilters={hasFilters} />
              )
            )}

            {activeTab === "network" && (
              <TeamCompanyNetwork companies={networkCompanies} />
            )}

            {activeTab === "leadership" && (
              <TeamLeadershipSections members={leadershipMembers} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
