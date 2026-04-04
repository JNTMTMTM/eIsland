/**
 * @file MaxExpandContent.tsx
 * @description 最大展开模式内容组件，独立于 Expanded 的大面板
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState } from 'react';
import useIslandStore from '../../../store/slices';
import '../../../styles/settings/settings.css';

/** 单条消息 */
interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

/**
 * 最大展开模式内容组件
 * @description 包含 AI 对话窗口，底部导航点可返回 expanded 状态
 */
export function MaxExpandContent(): React.ReactElement {
  const { setExpanded } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  /** 滚动到最新消息 */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** 滚轮返回 expanded（仅在聊天区域外触发） */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (target.closest('.max-expand-chat')) return;
      e.preventDefault();
      setExpanded();
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setExpanded]);

  /** 发送消息 */
  const handleSend = (): void => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    // 模拟 AI 回复
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: `收到：「${text}」— AI 功能开发中...` }]);
    }, 600);
  };

  /** 回车发送 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="settings-content" ref={contentRef}>
      {/* AI 对话窗口 */}
      <div className="max-expand-chat" onClick={(e) => e.stopPropagation()}>
        {/* 消息列表 */}
        <div className="max-expand-chat-messages">
          {messages.length === 0 && (
            <div className="max-expand-chat-empty">有什么可以帮你的？</div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`max-expand-chat-bubble ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {/* 输入栏 */}
        <div className="max-expand-chat-input-bar">
          <input
            className="max-expand-chat-input"
            type="text"
            placeholder="输入消息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="max-expand-chat-send" onClick={handleSend}>
            发送
          </button>
        </div>
      </div>

      {/* 底部导航点 — 返回 expanded */}
      <div className="settings-nav-dots" onClick={(e) => e.stopPropagation()}>
        <button
          className="settings-nav-dot"
          onClick={() => setExpanded()}
          title="返回"
          aria-label="返回到展开界面"
        />
        <button
          className="settings-nav-dot active"
          title="最大展开"
          aria-label="最大展开模式"
        />
      </div>
    </div>
  );
}
