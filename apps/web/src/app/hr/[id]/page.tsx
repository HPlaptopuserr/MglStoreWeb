import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HrHeadingPage } from "../_components/HrHeadingPage";
import { getHrServiceGroup, getHrServiceGroups } from "../_lib/hr-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { group } = await getHrServiceGroup(id);

  if (!group) {
    return {
      title: "HR үйлчилгээ олдсонгүй | MGL Store",
    };
  }

  return {
    title: `${group.label} | MGL Store`,
    description: group.description,
  };
}

export async function generateStaticParams() {
  const groups = await getHrServiceGroups();

  return groups.map((group) => ({
    id: group.id,
  }));
}

export default async function HrHeadingRoute({ params }: PageProps) {
  const { id } = await params;
  const { groups, group } = await getHrServiceGroup(id);

  if (!group) {
    notFound();
  }

  return <HrHeadingPage groups={groups} group={group} />;
}
