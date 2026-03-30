/**
 * @file notification.ts
 * @description 通知模块的类型定义，包括通知数据结构和优先级枚举
 * @author 鸡哥
 */

export type Priority = 'high' | 'medium' | 'low';

export interface NotificationAction {
  label: string;
  action: string;
}

export interface Notification {
  id: string;
  appId: string;
  appName: string;
  title: string;
  body: string;
  icon?: string;
  timestamp: number;
  priority: Priority;
  category: string;
  actions?: NotificationAction[];
  read: boolean;
}
