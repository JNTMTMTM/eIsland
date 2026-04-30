/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file MarkdownSiteLink.tsx
 * @description AI 对话 Markdown 网站链接卡片组件，自动获取网站标题与图标。
 * @author 鸡哥
 */

import React, { useEffect, useState } from 'react';
import {
  fetchWebsiteTitle,
  getWebsiteFaviconUrl,
  getWebsiteHostname,
} from '../../../../../../api/site/siteMetaApi';

type SiteLinkMeta = {
  hostname: string;
  title: string;
  iconUrl: string;
};

const SITE_LINK_META_CACHE = new Map<string, SiteLinkMeta>();

function sanitizeExternalUrl(rawUrl: string): string {
  let value = rawUrl.trim();
  if (!value) {
    return '';
  }
  const trailingPunctuations = [',', '.', ';', '!', '?', '，', '。', '；', '！', '？'];
  while (value.length > 0 && trailingPunctuations.includes(value[value.length - 1])) {
    value = value.slice(0, -1);
  }
  while (value.endsWith(')')) {
    const openCount = (value.match(/\(/g) ?? []).length;
    const closeCount = (value.match(/\)/g) ?? []).length;
    if (closeCount <= openCount) {
      break;
    }
    value = value.slice(0, -1);
  }
  return value;
}

function buildSiteLinkMeta(url: string): SiteLinkMeta {
  const hostname = getWebsiteHostname(url);
  return {
    hostname,
    title: hostname || url,
    iconUrl: getWebsiteFaviconUrl(url),
  };
}

/** Markdown 网站链接卡片组件，自动获取网站标题与 favicon。 */
export function MarkdownSiteLink(props: {
  href: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  target?: string;
  rel?: string;
  anchorProps?: React.AnchorHTMLAttributes<HTMLAnchorElement>;
}): React.ReactElement {
  const safeHref = typeof props.href === 'string' ? props.href.trim() : '';
  const openHref = sanitizeExternalUrl(safeHref);
  const isHttpLink = openHref.startsWith('http://') || openHref.startsWith('https://');
  const [meta, setMeta] = useState<SiteLinkMeta>(() => {
    if (!isHttpLink) {
      return { hostname: '', title: '', iconUrl: '' };
    }
    const cached = SITE_LINK_META_CACHE.get(openHref);
    return cached ?? buildSiteLinkMeta(openHref);
  });

  useEffect(() => {
    if (!isHttpLink) {
      return;
    }
    const cached = SITE_LINK_META_CACHE.get(openHref);
    if (cached) {
      setMeta(cached);
      return;
    }
    const fallback = buildSiteLinkMeta(openHref);
    setMeta(fallback);
    let cancelled = false;
    void fetchWebsiteTitle(openHref, 4500).then((title) => {
      if (cancelled) {
        return;
      }
      const trimmedTitle = title.trim();
      const next: SiteLinkMeta = {
        ...fallback,
        title: trimmedTitle || fallback.title,
      };
      SITE_LINK_META_CACHE.set(openHref, next);
      setMeta(next);
    }).catch(() => {
      if (!cancelled) {
        SITE_LINK_META_CACHE.set(openHref, fallback);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isHttpLink, openHref]);

  if (!isHttpLink) {
    return (
      <a
        {...(props.anchorProps ?? {})}
        href={props.href}
        target={props.target ?? '_blank'}
        rel={props.rel ?? 'noopener noreferrer'}
        onClick={props.onClick}
      >
        {props.children}
      </a>
    );
  }

  const displayTitle = meta.title || meta.hostname || openHref;
  const displayHost = meta.hostname;
  const fallbackIconText = (displayTitle || '?').slice(0, 1).toUpperCase();

  return (
    <a
      {...(props.anchorProps ?? {})}
      href={props.href}
      target={props.target ?? '_blank'}
      rel={props.rel ?? 'noopener noreferrer'}
      className="max-expand-chat-site-link"
      title={openHref}
      onClick={(event) => {
        props.onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        event.preventDefault();
        void window.api.clipboardOpenUrl(openHref).catch(() => {});
      }}
    >
      {meta.iconUrl ? (
        <img className="max-expand-chat-site-link-icon" src={meta.iconUrl} alt="" loading="lazy" />
      ) : (
        <span className="max-expand-chat-site-link-icon-fallback">{fallbackIconText}</span>
      )}
      <span className="max-expand-chat-site-link-meta">
        <span className="max-expand-chat-site-link-title">{displayTitle}</span>
        {displayHost ? <span className="max-expand-chat-site-link-host">{displayHost}</span> : null}
      </span>
    </a>
  );
}
