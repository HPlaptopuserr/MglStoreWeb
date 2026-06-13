type OrganizationLinkTarget = {
  id?: string | null;
  slug?: string | null;
};

export function organizationHandle(organization: OrganizationLinkTarget) {
  return organization.slug?.trim() || organization.id?.trim() || "";
}

export function organizationPath(organization: OrganizationLinkTarget) {
  const handle = organizationHandle(organization);

  return handle ? `/o/${encodeURIComponent(handle)}` : "/organizations";
}
