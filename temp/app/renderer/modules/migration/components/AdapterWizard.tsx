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
 * @file AdapterWizard.tsx
 * @description 沿用 guide 的分步构图，仅组合界面与迁移 hook。
 * @author 鸡哥
 */
import useMigration from '../hooks/useMigration';
import { STEPS } from '../config/migrationConfig';
import { ProcessIndicator } from '../../../../../../src/renderer/components/components/DynamicIslandProcessIndicator';
import WizardHeader from './WizardHeader';
import MigrationContent from './MigrationContent';
import WizardFooter from './WizardFooter';
import styles from './migration.module.css';

/** 组合独立升级向导。
 * @returns 由主进程状态驱动的界面。
 */
export default function AdapterWizard() {
  const model = useMigration();
  return (
    <main className={styles.wizard}>
      <WizardHeader t={model.t} language={model.language} onLanguage={model.setLanguage} onClose={model.close} installing={model.state?.phase === 'installing'} />
      <nav className={styles.navigation} aria-label={model.t('stepsLabel')}>
        <div aria-hidden="true"><ProcessIndicator total={STEPS.length} current={model.step} /></div>
        <ol className={styles.steps}>
          {STEPS.map((item, index) => <li key={item} aria-current={index === model.step ? 'step' : undefined}>{model.t(`steps.${item}`)}</li>)}
        </ol>
      </nav>
      <MigrationContent t={model.t} state={model.state} error={model.error} source={model.source} busy={model.busy} onSource={model.setSource} onDismissError={model.dismissError} onDirectory={model.chooseDirectory} onRemoveLegacy={model.setRemoveLegacy} />
      <WizardFooter t={model.t} state={model.state} busy={model.busy} onPrimary={model.primary} onCancel={model.cancel} />
    </main>
  );
}
