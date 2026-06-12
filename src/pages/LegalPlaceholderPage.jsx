import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/common/Card";
import {
  BROWSER_STORAGE_NOTICE,
  LEGAL_PLACEHOLDER_NOTICE,
} from "../constants/privacyText";

const pageContent = {
  about: {
    title: "About Lomir",
    intro:
      "Lomir is a free, non-commercial, open-source portfolio and learning project by two private developers.",
  },
  privacy: {
    title: "Privacy Policy",
    intro: "Full Privacy Policy coming soon.",
    showStorage: true,
  },
  terms: {
    title: "Terms of Service",
    intro: "Full Terms of Service coming soon.",
  },
  legalNotice: {
    title: "Legal Notice",
    intro: "Full Legal Notice coming soon.",
  },
};

const LegalPlaceholderPage = ({ type }) => {
  const content = pageContent[type] ?? pageContent.about;

  return (
    <div className="mx-auto max-w-3xl">
      <Card hoverable={false} truncateContent={false}>
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-medium text-primary">
              {content.title}
            </h1>
            <p className="mt-3 text-base-content/75">{content.intro}</p>
          </div>

          <p className="text-base-content/75">{LEGAL_PLACEHOLDER_NOTICE}</p>

          {content.showStorage && (
            <section className="rounded-lg border border-base-300 bg-base-200/40 p-4">
              <h2 className="text-lg font-medium text-base-content">
                Browser Storage
              </h2>
              <p className="mt-2 text-sm text-base-content/75">
                {BROWSER_STORAGE_NOTICE}
              </p>
            </section>
          )}

          <p className="text-sm text-base-content/60">
            For questions while the final documents are being prepared, please{" "}
            <Link to="/contact" className="link link-primary">
              contact the Lomir team
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
};

export default LegalPlaceholderPage;
