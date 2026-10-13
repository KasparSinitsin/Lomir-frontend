import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import PageContainer from "../components/layout/PageContainer";
import FocusAreaSupercategorySection from "../components/focusAreas/FocusAreaSupercategorySection";
import Alert from "../components/common/Alert";
import { useStructuredTags } from "../hooks/useTagQueries";
import { SUPERCATEGORY_ORDER } from "../constants/badgeConstants";

const orderSupercategories = (supercategories) => {
  const rank = (name) => {
    const index = SUPERCATEGORY_ORDER.indexOf(name);
    return index === -1 ? SUPERCATEGORY_ORDER.length : index;
  };
  return [...supercategories].sort(
    (a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name),
  );
};

const FocusAreaOverview = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStructuredTags();

  const supercategories = useMemo(
    () => orderSupercategories(Array.isArray(data) ? data : []),
    [data],
  );

  if (isLoading) {
    return (
      <PageContainer variant="muted">
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer variant="muted">
        <Alert
          type="error"
          message={t("focusAreaOverview.loadError")}
          className="w-full shadow-sm"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t("focusAreaOverview.title")}
      subtitle={t("focusAreaOverview.intro")}
      variant="muted"
    >
      {supercategories.map((supercategory) => (
        <FocusAreaSupercategorySection
          key={supercategory.id}
          supercategory={supercategory}
        />
      ))}
    </PageContainer>
  );
};

export default FocusAreaOverview;
