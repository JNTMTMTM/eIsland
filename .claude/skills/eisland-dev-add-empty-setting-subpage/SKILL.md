---
name: eisland-dev-add-empty-setting-subpage
description: >
  Add a new empty subpage (tab) to an existing eIsland settings section with page navigation support.
  Use this skill whenever the user wants to add a new tab/page/subpage to any settings section in the eIsland project,
  including requests like "添加分页", "add a tab", "add subpage", "新建空白分页", "add empty page to settings",
  or when extending settings sections like AI, update, network, music, weather, mail, etc. with new page navigation.
  This skill handles the full workflow: type definitions, config constants, PageDots component, section modifications,
  SettingsTab state wiring, and i18n translations.
---

# eIsland: Add Empty Settings Subpage

This skill guides you through adding a new empty subpage (with page navigation) to an existing eIsland settings section.

## When to Use

- User asks to add a new tab/page/subpage to any settings section
- User wants to extend a settings section with page navigation
- User mentions "分页", "tab", "subpage" in context of settings

## Prerequisites

Before starting, identify:
1. **Target settings section** — which section to extend (e.g., `update`, `ai`, `network`, `music`, `weather`, `mail`)
2. **New page key** — a kebab-case identifier (e.g., `info-sync`, `data-center`)
3. **New page label** — display name in Chinese (e.g., `信息同步`)

## Reference Pattern

The canonical implementation pattern is the **AI settings section** (`ai`), which has pages: `general`, `r1pxc`, `ollama`.

Key reference files:
- `src/renderer/components/states/maxExpand/components/setting/utils/settingsConfig.ts` — types & config
- `src/renderer/components/states/maxExpand/components/setting/components/ai/AiSettingsSection.tsx` — section with pages
- `src/renderer/components/states/maxExpand/components/setting/components/ai/AiSettingsPageDots.tsx` — page dots component
- `src/renderer/components/states/maxExpand/components/setting/components/SettingsPageNavigation.tsx` — shared navigation

## Step-by-Step Workflow

### Step 1: Update `settingsConfig.ts`

File: `src/renderer/components/states/maxExpand/components/setting/utils/settingsConfig.ts`

**1a.** Add/extend the page key type:
```typescript
// If the type already exists, add the new key to the union
export type XxxSettingsPageKey = 'existing-page' | 'new-page';
// If creating a new type, add it after similar types
```

**1b.** Update `SettingsTabLabelKey` union type to include the new page key:
```typescript
export type SettingsTabLabelKey = SettingsSidebarTabKey | AppSettingsPageKey | AiSettingsPageKey | MusicNavCardKey | NewPageKey;
```

**1c.** Add labels in `SETTINGS_TAB_LABELS`:
```typescript
'new-page': '新页面名称',
```

**1d.** Add descriptions in `SETTINGS_TAB_DESCRIPTIONS`:
```typescript
'new-page': '新页面描述',
```

**1e.** Add pages array and labels record (after similar definitions):
```typescript
export const XXX_SETTINGS_PAGES: XxxSettingsPageKey[] = ['existing-page', 'new-page'];
export const XXX_SETTINGS_PAGE_LABELS: Record<XxxSettingsPageKey, string> = {
  'existing-page': '已有页面',
  'new-page': '新页面',
};
```

### Step 2: Create PageDots Component

Create: `src/renderer/components/states/maxExpand/components/setting/components/<section>/<Section>SettingsPageDots.tsx`

Follow the pattern from `AiSettingsPageDots.tsx`:
```typescript
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPageNavigation } from '../SettingsPageNavigation';
import type { XxxSettingsPageKey } from '../../utils/settingsConfig';

export interface XxxSettingsPageDotsProps {
  xxxSettingsPage: XxxSettingsPageKey;
  expanded: boolean;
  xxxSettingsPages: XxxSettingsPageKey[];
  settingsTabLabels: Record<string, string>;
  setXxxSettingsPage: (page: XxxSettingsPageKey) => void;
}

export function XxxSettingsPageDots({
  xxxSettingsPage,
  expanded,
  xxxSettingsPages,
  settingsTabLabels,
  setXxxSettingsPage,
}: XxxSettingsPageDotsProps): ReactElement {
  const { t } = useTranslation();
  return (
    <SettingsPageNavigation
      activePage={xxxSettingsPage}
      expanded={expanded}
      pages={xxxSettingsPages}
      pageLabels={settingsTabLabels}
      navigationLabel={t('settings.xxx.pagination')}
      onSelectPage={setXxxSettingsPage}
    />
  );
}
```

### Step 3: Modify the Settings Section

Modify: `src/renderer/components/states/maxExpand/components/setting/components/<section>/<Section>SettingsSection.tsx`

**3a.** Add imports:
```typescript
import { useState, type ReactElement } from 'react';
import { XxxSettingsPageDots } from './XxxSettingsPageDots';
import { SettingsPageNavigationToggle } from '../SettingsPageNavigation';
import type { XxxSettingsPageKey } from '../../utils/settingsConfig';
```

**3b.** Add props to the interface:
```typescript
currentXxxSettingsPageLabel: string;
xxxSettingsPage: XxxSettingsPageKey;
xxxSettingsPages: XxxSettingsPageKey[];
xxxSettingsPageLabels: Record<string, string>;
setXxxSettingsPage: (page: XxxSettingsPageKey) => void;
```

**3c.** Add state and page rendering in the component body:
```typescript
const [pageNavigationExpanded, setPageNavigationExpanded] = useState(false);

// Wrap existing content in a page render function
const renderExistingPage = (): ReactElement => (
  <div className="settings-cards">
    {/* existing cards here */}
  </div>
);

// Add new empty page
const renderNewPage = (): ReactElement => (
  <div className="settings-cards">
    {/* empty - to be implemented */}
  </div>
);

const renderCurrentPage = (): ReactElement | null => {
  switch (xxxSettingsPage) {
    case 'existing-page':
      return renderExistingPage();
    case 'new-page':
      return renderNewPage();
    default:
      return null;
  }
};
```

**3d.** Update the JSX return to use page layout:
```typescript
return (
  <div className="max-expand-settings-section">
    <div className="max-expand-settings-title settings-app-title-line">
      <span>{t('settings.labels.xxx', { defaultValue: 'XXX设置' })}</span>
      <span className="settings-app-title-sub">- {currentXxxSettingsPageLabel}</span>
      <SettingsPageNavigationToggle
        expanded={pageNavigationExpanded}
        label={t(pageNavigationExpanded ? 'settings.navigation.collapse' : 'settings.navigation.expand')}
        onToggle={() => setPageNavigationExpanded((current) => !current)}
      />
    </div>
    <div className="settings-app-pages-layout">
      <div className="settings-app-page-main">{renderCurrentPage()}</div>
      <XxxSettingsPageDots
        xxxSettingsPage={xxxSettingsPage}
        expanded={pageNavigationExpanded}
        xxxSettingsPages={xxxSettingsPages}
        settingsTabLabels={xxxSettingsPageLabels}
        setXxxSettingsPage={setXxxSettingsPage}
      />
    </div>
  </div>
);
```

### Step 4: Update SettingsTab.tsx

File: `src/renderer/components/states/maxExpand/components/SettingsTab.tsx`

**4a.** Add imports for new constants and types:
```typescript
import {
  // ... existing imports
  XXX_SETTINGS_PAGES,
  XXX_SETTINGS_PAGE_LABELS,
  type XxxSettingsPageKey,
} from './setting/utils/settingsConfig';
```

**4b.** Add state (near other page states ~line 228):
```typescript
const [xxxSettingsPage, setXxxSettingsPage] = useState<XxxSettingsPageKey>('default-page');
```

**4c.** Add current page label (near other labels ~line 284):
```typescript
const currentXxxSettingsPageLabel = t(`settings.xxxPages.${xxxSettingsPage}`, { defaultValue: XXX_SETTINGS_PAGE_LABELS[xxxSettingsPage] || '默认页面' });
```

**4d.** Add translated page labels (near other translated labels ~line 306):
```typescript
const translatedXxxSettingsPageLabels = useMemo<Record<XxxSettingsPageKey, string>>(() => ({
  'existing-page': t('settings.xxxPages.existing-page', { defaultValue: XXX_SETTINGS_PAGE_LABELS['existing-page'] }),
  'new-page': t('settings.xxxPages.new-page', { defaultValue: XXX_SETTINGS_PAGE_LABELS['new-page'] }),
}), [t]);
```

**4e.** Pass new props to the section component:
```typescript
<XxxSettingsSection
  // ... existing props
  currentXxxSettingsPageLabel={currentXxxSettingsPageLabel}
  xxxSettingsPage={xxxSettingsPage}
  xxxSettingsPages={XXX_SETTINGS_PAGES}
  xxxSettingsPageLabels={translatedXxxSettingsPageLabels}
  setXxxSettingsPage={setXxxSettingsPage}
/>
```

### Step 5: Add i18n Translations

**5a.** `i18n/zh-CN.json` — add after `networkPages`:
```json
"xxxPages": {
  "existing-page": "已有页面",
  "new-page": "新页面"
},
```

**5b.** `i18n/en-US.json` — add after `networkPages`:
```json
"xxxPages": {
  "existing-page": "Existing Page",
  "new-page": "New Page"
},
```

### Step 6: Verify

Run TypeScript type check:
```bash
npx tsc --noEmit --skipLibCheck
```

Validate JSON:
```bash
node -e "JSON.parse(require('fs').readFileSync('i18n/zh-CN.json', 'utf8')); console.log('OK')"
node -e "JSON.parse(require('fs').readFileSync('i18n/en-US.json', 'utf8')); console.log('OK')"
```

## File Checklist

After completing all steps, verify these files were touched:
- [ ] `utils/settingsConfig.ts` — type, labels, descriptions, pages array, labels record
- [ ] `components/<section>/<Section>SettingsPageDots.tsx` — NEW file
- [ ] `components/<section>/<Section>SettingsSection.tsx` — page rendering + navigation
- [ ] `components/SettingsTab.tsx` — state, labels, props
- [ ] `i18n/zh-CN.json` — page translations
- [ ] `i18n/en-US.json` — page translations
