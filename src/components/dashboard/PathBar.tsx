"use client";

import { useState } from "react";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CheckIcon from "@mui/icons-material/Check";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LinkIcon from "@mui/icons-material/Link";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { isModifiedClick, TAB_LABEL } from "@/lib/routes";
import { ALL_PROJECTS } from "@/lib/types";
import { useDashboard } from "./DashboardContext";

interface Crumb {
  label: React.ReactNode;
  href?: string;
}

/** Breadcrumb trail for the current view, plus its URL path with a copy-link button. */
export default function PathBar() {
  const { tab, activeProject, isInHistory, navigate, pathFor } = useDashboard();
  const [copied, setCopied] = useState(false);

  const crumbs: Crumb[] = [
    {
      label: (
        <span className="inline-flex items-center gap-1">
          <HomeOutlinedIcon sx={{ fontSize: 16 }} /> Home
        </span>
      ),
      href: "/",
    },
  ];
  if (tab === "history") {
    crumbs.push({ label: TAB_LABEL.history });
  } else if (activeProject) {
    const finished = isInHistory(activeProject.id);
    crumbs.push(finished ? { label: TAB_LABEL.history, href: pathFor(ALL_PROJECTS, "history") } : { label: "Projects", href: "/" });
    crumbs.push({ label: activeProject.name, href: pathFor(activeProject.id, "dashboard") });
    crumbs.push({ label: TAB_LABEL[tab] });
  } else {
    crumbs.push({ label: "All Projects", href: "/" });
    crumbs.push({ label: TAB_LABEL[tab] });
  }

  // Shown decoded so Thai slugs stay readable; the copied link uses the encoded form.
  const path = pathFor(activeProject?.id ?? ALL_PROJECTS, tab);
  const displayPath = decodeURIComponent(path);

  const follow = (href: string) => (e: React.MouseEvent) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    navigate(href);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — nothing to do
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 bg-slate-50/80 px-6 py-2">
      <Breadcrumbs
        aria-label="Path"
        separator={<NavigateNextIcon sx={{ fontSize: 16 }} className="text-slate-300" />}
        maxItems={5}
        className="min-w-0 !text-xs"
      >
        {crumbs.map((c, i) =>
          c.href && i < crumbs.length - 1 ? (
            <a
              key={i}
              href={c.href}
              onClick={follow(c.href)}
              className="block max-w-60 truncate font-medium text-slate-500 hover:text-sky-600 hover:underline"
            >
              {c.label}
            </a>
          ) : (
            <span key={i} aria-current="page" className="block max-w-72 truncate font-semibold text-slate-800">
              {c.label}
            </span>
          ),
        )}
      </Breadcrumbs>
      <div className="flex items-center gap-1">
        <code
          className="max-w-72 truncate rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-slate-500 ring-1 ring-slate-200"
          title={displayPath}
        >
          {displayPath}
        </code>
        <Tooltip title={copied ? "Copied!" : "Copy link to this page"}>
          <IconButton size="small" aria-label="Copy link to this page" onClick={copyLink}>
            {copied ? <CheckIcon sx={{ fontSize: 16 }} className="text-green-600" /> : <LinkIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
