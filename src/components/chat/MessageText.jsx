import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Link as LinkIcon, ExternalLink } from "lucide-react";
import Tooltip from "../common/Tooltip";
import { useAuth } from "../../contexts/AuthContext";
import { splitChatSearchMatches } from "../../utils/chatSearch";
import { findMentions, resolveMentionLabel } from "../../utils/mentions";
import { useMentionNames } from "../../contexts/MentionNamesContext";

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

// One phrase, case- and diacritic-insensitive — the rule lives in
// `chatSearch.js` beside the counter that has to agree with it.
const renderHighlightedText = (value, query) => {
  const parts = splitChatSearchMatches(value, query);
  if (parts.length === 1 && !parts[0].isMatch) return parts[0].text;

  return parts.map((part, index) =>
    part.isMatch ? (
      <mark
        key={index}
        className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-[var(--color-primary-focus)]"
      >
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
};

// --- UI ------------------------------------------------------

const LinkChip = ({ href }) => {
  const { label, Icon } = classifyUrl(href);

  return (
    <Tooltip content={href} position="top">
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
      >
        <Icon size={16} className="text-primary flex-shrink-0" />
        <span className="font-medium whitespace-nowrap">{label}</span>
        <span className="text-base-content/60 truncate max-w-[12rem]">
          {shortenForDisplay(href)}
        </span>
        <ExternalLink size={14} className="text-base-content/40 flex-shrink-0" />
      </a>
    </Tooltip>
  );
};

const MentionChip = ({ name, userId, onUserClick }) => {
  const { t } = useTranslation();
  const { blockedRelationshipIds } = useAuth();
  const { names, requestIds } = useMentionNames();

  // Each chip asks for its own id; the context dedupes and batches, so a
  // transcript full of mentions is one request. `@all` is filtered out there.
  useEffect(() => {
    requestIds([String(userId)]);
  }, [requestIds, userId]);

  // 🔴 The stored `name` is only the FALLBACK now. It was written into the
  // message at send time, so it is a deleted person's real name until this
  // resolves, and a renamed person's old one forever. The precedence - @all,
  // then blocked, then deleted, then current, then stored - lives in
  // resolveMentionLabel so that all six mention surfaces share it.
  const { label, isAnonymized } = resolveMentionLabel(
    { name, userId },
    { blockedIds: blockedRelationshipIds, names, t },
  );

  if (userId === "all" || !onUserClick) {
    return <span className="font-medium text-primary">@{label}</span>;
  }
  // Anonymized either way - blocked (F12) or deleted - gets no click, since
  // there is nothing to open and the reader must not tell the two apart.
  if (isAnonymized) {
    return (
      <span className="font-medium text-base-content/50">@{label}</span>
    );
  }
  return (
    <button
      type="button"
      className="font-medium text-primary underline underline-offset-2 hover:no-underline transition-colors"
      onClick={() => onUserClick(userId, label)}
    >
      @{label}
    </button>
  );
};

const PlainLink = ({ href }) => (
  <Tooltip content={href} position="top">
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="
        underline underline-offset-2
        text-primary hover:no-underline
        break-words
      "
    >
      {shortenForDisplay(href)}
    </a>
  </Tooltip>
);

export default function MessageText({ content, searchQuery = "", onUserClick }) {
  if (!content) return null;

  // Collect all special segments (mentions + URLs), sorted by position
  const mentionMatches = findMentions(content).map((m) => ({
    ...m,
    type: "mention",
  }));
  const mentionRanges = mentionMatches.map((m) => [m.index, m.end]);
  const urlMatches = findUrls(content).filter(
    (u) => !mentionRanges.some(([s, e]) => u.index >= s && u.end <= e),
  );

  const allMatches = [
    ...mentionMatches,
    ...urlMatches.map((u) => ({ ...u, type: "url" })),
  ].sort((a, b) => a.index - b.index);

  if (allMatches.length === 0) {
    return (
      <span className="whitespace-pre-wrap break-words">
        {renderHighlightedText(content, searchQuery)}
      </span>
    );
  }

  const parts = [];
  let last = 0;

  allMatches.forEach((match) => {
    if (match.index > last) {
      parts.push({ type: "text", value: content.slice(last, match.index) });
    }

    if (match.type === "mention") {
      parts.push({ type: "mention", name: match.name, userId: match.userId });
    } else {
      const href = normalizeUrl(match.raw);
      if (!isHttpUrl(href)) {
        parts.push({ type: "text", value: match.raw });
      } else {
        const cls = classifyUrl(href);
        parts.push({ type: cls.kind, href });
      }
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
          return (
            <React.Fragment key={idx}>
              {renderHighlightedText(p.value, searchQuery)}
            </React.Fragment>
          );
        if (p.type === "mention")
          return (
            <MentionChip
              key={idx}
              name={p.name}
              userId={p.userId}
              onUserClick={onUserClick}
            />
          );
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
