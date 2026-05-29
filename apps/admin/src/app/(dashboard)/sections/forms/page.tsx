"use client";

import { FormBuilderTool } from "@/components/organisms/FormBuilderTool";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";

export default function FormsSectionPage() {
  return (
    <SectionsRouteFrame active="forms">
      <FormBuilderTool />
    </SectionsRouteFrame>
  );
}
