import type { ReactElement } from 'react';
import avatarImg from '../../../../../../../assets/avatar/T.jpg';

interface AboutSettingsSectionProps {
  aboutVersion: string;
}

export function AboutSettingsSection({ aboutVersion }: AboutSettingsSectionProps): ReactElement {
  return (
    <div className="max-expand-settings-section settings-about">
      <div className="max-expand-settings-title">关于软件</div>
      <div className="settings-about-author">
        <img className="settings-about-avatar" src={avatarImg} alt="作者头像" />
        <div className="settings-about-author-info">
          <div className="settings-about-name">
            <a className="settings-about-github" href="https://github.com/JNTMTMTM" target="_blank" rel="noreferrer" title="GitHub 主页">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            </a>
            鸡哥 <span className="settings-about-id">JNTMTMTM</span>
          </div>
          <div className="settings-about-version">eIsland v{aboutVersion}</div>
        </div>
      </div>
      <div className="settings-about-notice">本软件开源免费，如果你在任何地方付费购买了本软件，请立即退款并给差评。</div>
      <div className="settings-about-links">
        <div className="settings-about-row"><span className="settings-about-label">官网</span><a className="settings-about-link" href="https://www.pyisland.com" target="_blank" rel="noreferrer">www.pyisland.com</a></div>
        <div className="settings-about-row"><span className="settings-about-label">文档站</span><a className="settings-about-link" href="https://docs.pyisland.com" target="_blank" rel="noreferrer">docs.pyisland.com</a></div>
        <div className="settings-about-row"><span className="settings-about-label">开源代码</span><a className="settings-about-link" href="https://github.com/JNTMTMTM/eIsland" target="_blank" rel="noreferrer">github.com/JNTMTMTM/eIsland</a></div>
        <div className="settings-about-row"><span className="settings-about-label">开源协议</span><span className="settings-about-value">GPL-3.0</span></div>
        <div className="settings-about-row"><span className="settings-about-label">图标库</span><a className="settings-about-link" href="https://www.iconfont.cn/" target="_blank" rel="noreferrer">iconfont.cn</a></div>
      </div>
      <div className="settings-about-deps">
        <div className="settings-about-deps-title">开源框架 & 依赖</div>
        <div className="settings-about-deps-grid">
          <span className="settings-about-dep">Electron</span><span className="settings-about-dep">React</span><span className="settings-about-dep">React DOM</span><span className="settings-about-dep">TypeScript</span><span className="settings-about-dep">Zustand</span><span className="settings-about-dep">Tailwind CSS</span><span className="settings-about-dep">Vite</span><span className="settings-about-dep">electron-vite</span><span className="settings-about-dep">electron-builder</span><span className="settings-about-dep">react-markdown</span><span className="settings-about-dep">react-datepicker</span><span className="settings-about-dep">remark-gfm</span><span className="settings-about-dep">@coooookies/windows-smtc-monitor</span><span className="settings-about-dep">openmeteo</span><span className="settings-about-dep">lunar-javascript</span><span className="settings-about-dep">lyric-resolver</span><span className="settings-about-dep">colorthief</span><span className="settings-about-dep">lucide-react</span><span className="settings-about-dep">@electron-toolkit/preload</span><span className="settings-about-dep">@electron-toolkit/utils</span><span className="settings-about-dep">@electron-toolkit/tsconfig</span><span className="settings-about-dep">@tailwindcss/vite</span><span className="settings-about-dep">@vitejs/plugin-react</span><span className="settings-about-dep">PostCSS</span><span className="settings-about-dep">Autoprefixer</span>
        </div>
      </div>
      <div className="settings-about-footer">
        <div className="settings-about-copyright">© JNTMTMTM, pyisland.com 版权所有</div>
        <div className="settings-about-slogan">算法诠释一切 质疑即是认可</div>
      </div>
    </div>
  );
}
