import {
  generateMetadata,
  renderOrganizationDetailPage,
  type PageProps,
} from "../../organizations/[id]/page";

export { generateMetadata };

export default async function OrganizationShortLinkPage(props: PageProps) {
  return renderOrganizationDetailPage(props);
}
