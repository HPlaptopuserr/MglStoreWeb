"use client";

import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { SurveySection } from "@/components/organisms/sections/survey/SurveySection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function SurveySectionPage() {
  const {
    surveySettings,
    setSurveySettings,
    saving,
    saved,
    saveSurveySettings,
  } = useSiteSettings();

  return (
    <SectionsRouteFrame
      active="survey"
      onSave={() => saveSurveySettings()}
      saving={saving}
      saved={saved}
    >
      <SectionContent>
        <SurveySection
          settings={surveySettings}
          setSettings={setSurveySettings}
          onSave={() => saveSurveySettings()}
          saving={saving}
          saved={saved}
        />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
