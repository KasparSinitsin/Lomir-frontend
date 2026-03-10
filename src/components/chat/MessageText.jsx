import React from "react";
import { Cloud, Link as LinkIcon, ExternalLink } from "lucide-react";

// --- helpers -------------------------------------------------

const isHttpUrl = (raw) => {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// Supports: https://..., http://..., and www....
const findUrls = (text) => {
  if (!text) return [];
  const regex = /((?:https?:\/\/|www\.)[^\s<>"'`]+)(?=[\s]|$)/gi;

  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push({
      raw: m[1],
      index: m.index,
      end: m.index + m[1].length,
    });
  }
  return matches;
};

const normalizeUrl = (raw) => {
  const trimmed = raw.replace(/[),.?!:;"']+$/g, ""); // trim common trailing punctuation
  if (trimmed.toLowerCase().startsWith("www.")) return `https://${trimmed}`;
  return trimmed;
};

const getHost = (href) => {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const classifyUrl = (href) => {
  const host = getHost(href);

  // Google Drive / Docs
  if (
    host === "drive.google.com" ||
    host.endsWith(".drive.google.com") ||
    host === "docs.google.com"
  ) {
    return { kind: "file", label: "Google Drive", Icon: Cloud };
  }

  // Dropbox
  if (host === "dropbox.com" || host.endsWith(".dropbox.com")) {
    return { kind: "file", label: "Dropbox", Icon: Cloud };
  }

  // OneDrive / SharePoint
  if (
    host === "1drv.ms" ||
    host === "onedrive.live.com" ||
    host.endsWith(".sharepoint.com")
  ) {
    return { kind: "file", label: "OneDrive", Icon: Cloud };
  }

  // Box
  if (host === "box.com" || host.endsWith(".box.com")) {
    return { kind: "file", label: "Box", Icon: Cloud };
  }

  // WeTransfer
  if (host === "wetransfer.com" || host.endsWith(".wetransfer.com")) {
    return { kind: "file", label: "WeTransfer", Icon: Cloud };
  }

  return { kind: "link", label: host || "Link", Icon: LinkIcon };
};

const shortenForDisplay = (href) => {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname && u.pathname !== "/" ? u.pathname : "";
    const display = `${host}${path}`;
    return display.length > 42 ? `${display.slice(0, 39)}…` : display;
  } catch {
    return href;
  }
};

// --- UI ------------------------------------------------------

const LinkChip = ({ href }) => {
  const { label, Icon } = classifyUrl(href);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="
        inline-flex items-center gap-2 
        px-2 py-1 rounded-lg 
        bg-base-100/60 hover:bg-base-100
        border border-base-200
        text-sm text-base-content
        max-w-full align-middle
      "
      title={href}
    >
      <Icon size={16} className="text-primary flex-shrink-0" />
      <span className="font-medium whitespace-nowrap">{label}</span>
      <span className="text-base-content/60 truncate max-w-[12rem]">
        {shortenForDisplay(href)}
      </span>
      <ExternalLink size={14} className="text-base-content/40 flex-shrink-0" />
    </a>
  );
};

const PlainLink = ({ href }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="
      underline underline-offset-2
      text-primary hover:no-underline
      break-words
    "
    title={href}
  >
    {shortenForDisplay(href)}
  </a>
);

export default function MessageText({ content }) {
  if (!content) return null;

  const matches = findUrls(content);
  if (matches.length === 0) return <span>{content}</span>;

  const parts = [];
  let last = 0;

  matches.forEach((match, i) => {
    if (match.index > last) {
      parts.push({ type: "text", value: content.slice(last, match.index) });
    }

    const href = normalizeUrl(match.raw);
    // Safety: only render clickable if valid http(s)
    if (!isHttpUrl(href)) {
      parts.push({ type: "text", value: match.raw });
    } else {
      const cls = classifyUrl(href);
      parts.push({ type: cls.kind, href });
    }

    last = match.end;
  });

  if (last < content.length) {
    parts.push({ type: "text", value: content.slice(last) });
  }

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((p, idx) => {
        if (p.type === "text")
          return <React.Fragment key={idx}>{p.value}</React.Fragment>;
        if (p.type === "file")
          return (
            <React.Fragment key={idx}>
              {" "}
              <LinkChip href={p.href} />{" "}
            </React.Fragment>
          );
        return (
          <React.Fragment key={idx}>
            {" "}
            <PlainLink href={p.href} />{" "}
          </React.Fragment>
        );
      })}
    </span>
  );
}
