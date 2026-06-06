import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import {
  DEFAULT_TEAM_ORG_LAYOUT,
  TeamCompanyInfo,
  TeamCompanyNode,
  TeamInvestor,
  TeamMember,
  TeamNetworkCompany,
  TeamOrgLayoutSettings,
} from "./team-types";
import { MOCK_TEAM_MEMBERS } from "./team-mock-data";

const DEFAULT_COMPANY_INFO: TeamCompanyInfo = {
  name: "MGL Store ХХК",
  subtitle: "MGL Store LLC",
};

function parseCompanyNodes(
  value: string | undefined,
  fallback: TeamCompanyInfo,
): TeamCompanyNode[] {
  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const nodes = parsed
          .map((node, index) => ({
            id: typeof node?.id === "string" ? node.id : `company-${index}`,
            name: typeof node?.name === "string" && node.name.trim() ? node.name.trim() : fallback.name,
            subtitle: typeof node?.subtitle === "string" && node.subtitle.trim() ? node.subtitle.trim() : fallback.subtitle,
            order: typeof node?.order === "number" ? node.order : index,
          }))
          .filter((node) => node.id && node.name)
          .sort((a, b) => a.order - b.order);

        if (nodes.length > 0) return nodes;
      }
    } catch {
      // Use the legacy single company setting below.
    }
  }

  return [{ id: "root-company", name: fallback.name, subtitle: fallback.subtitle, order: 0 }];
}

function parseDepartmentConnections(value: string | undefined) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([department, companyId]) =>
          typeof department === "string" && typeof companyId === "string",
      ),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function parseDepartmentOrder(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => {
        if (!item || seen.has(item)) return false;
        seen.add(item);
        return true;
      });
  } catch {
    return [];
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function parseTeamOrgLayout(value: string | undefined): TeamOrgLayoutSettings {
  if (!value) return DEFAULT_TEAM_ORG_LAYOUT;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_TEAM_ORG_LAYOUT;
    }
    return {
      rootCardWidth: clampNumber(parsed.rootCardWidth, 190, 340, DEFAULT_TEAM_ORG_LAYOUT.rootCardWidth),
      departmentCardWidth: clampNumber(parsed.departmentCardWidth, 130, 260, DEFAULT_TEAM_ORG_LAYOUT.departmentCardWidth),
      companyGap: clampNumber(parsed.companyGap, 8, 64, DEFAULT_TEAM_ORG_LAYOUT.companyGap),
      departmentGap: clampNumber(parsed.departmentGap, 8, 72, DEFAULT_TEAM_ORG_LAYOUT.departmentGap),
      verticalGap: clampNumber(parsed.verticalGap, 32, 110, DEFAULT_TEAM_ORG_LAYOUT.verticalGap),
      lineColor: typeof parsed.lineColor === "string" && /^#[0-9a-fA-F]{6}$/.test(parsed.lineColor)
        ? parsed.lineColor
        : DEFAULT_TEAM_ORG_LAYOUT.lineColor,
    };
  } catch {
    return DEFAULT_TEAM_ORG_LAYOUT;
  }
}

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [investors, setInvestors] = useState<TeamInvestor[]>([]);
  const [networkCompanies, setNetworkCompanies] = useState<TeamNetworkCompany[]>([]);
  const [companyInfo, setCompanyInfo] = useState<TeamCompanyInfo>(DEFAULT_COMPANY_INFO);
  const [companyNodes, setCompanyNodes] = useState<TeamCompanyNode[]>([
    { id: "root-company", ...DEFAULT_COMPANY_INFO, order: 0 },
  ]);
  const [departmentConnections, setDepartmentConnections] = useState<Record<string, string>>({});
  const [departmentOrder, setDepartmentOrder] = useState<string[]>([]);
  const [orgLayout, setOrgLayout] = useState<TeamOrgLayoutSettings>(DEFAULT_TEAM_ORG_LAYOUT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch(`${API}/team`).then((response) => (response.ok ? response.json() : [])),
      fetch(`${API}/investors`).then((response) => (response.ok ? response.json() : [])),
      fetch(`${API}/partners?limit=10000`).then((response) => (response.ok ? response.json() : null)),
      fetch(`${API}/site-settings`).then((response) => (response.ok ? response.json() : {})),
    ])
      .then(([teamData, investorData, partnerData, settings]) => {
        if (mounted) {
          const settingMap = settings as Record<string, string | undefined>;
          const teamMembers = Array.isArray(teamData) ? teamData : [];
          const investorItems = Array.isArray(investorData) ? investorData : [];
          const partnerItems = Array.isArray(partnerData?.data)
            ? partnerData.data
            : Array.isArray(partnerData?.partners)
              ? partnerData.partners
              : Array.isArray(partnerData)
                ? partnerData
                : [];

          setMembers(teamMembers.length > 0 ? teamMembers : MOCK_TEAM_MEMBERS);
          setInvestors(investorItems);
          setNetworkCompanies(partnerItems);
          const nextCompanyInfo = {
            name: settingMap.teamCompanyName || DEFAULT_COMPANY_INFO.name,
            subtitle: settingMap.teamCompanySubtitle || DEFAULT_COMPANY_INFO.subtitle,
          };
          setCompanyInfo(nextCompanyInfo);
          setCompanyNodes(parseCompanyNodes(settingMap.teamCompanyNodes, nextCompanyInfo));
          setDepartmentConnections(parseDepartmentConnections(settingMap.teamDepartmentConnections));
          setDepartmentOrder(parseDepartmentOrder(settingMap.teamDepartments));
          setOrgLayout(parseTeamOrgLayout(settingMap.teamOrgLayout));
        }
      })
      .catch(() => {
        if (mounted) {
          setMembers(MOCK_TEAM_MEMBERS);
          setInvestors([]);
          setNetworkCompanies([]);
          setCompanyInfo(DEFAULT_COMPANY_INFO);
          setCompanyNodes([{ id: "root-company", ...DEFAULT_COMPANY_INFO, order: 0 }]);
          setDepartmentConnections({});
          setDepartmentOrder([]);
          setOrgLayout(DEFAULT_TEAM_ORG_LAYOUT);
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

  return {
    members,
    investors,
    networkCompanies,
    companyInfo,
    companyNodes,
    departmentConnections,
    departmentOrder,
    orgLayout,
    loading,
  };
}
