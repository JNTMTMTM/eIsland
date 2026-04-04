/**
 * @file AiChatTab.tsx
 * @description 最大展开模式 — AI 对话 Tab
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState } from 'react';

/** 单条消息 */
interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

/**
 * AI 对话 Tab
 * @description 包含消息列表和输入栏的聊天界面
 */
export function AiChatTab(): React.ReactElement {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  /** 滚动到最新消息 */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="max-expand-chat">
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
  );
}
