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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

#ifndef TOAST_LISTENER_TYPES_H
#define TOAST_LISTENER_TYPES_H

#include <windows.h>
#include <roapi.h>
#include <windows.ui.notifications.management.h>
#include <windows.ui.notifications.h>
#include <asyncinfo.h>
#include <windows.applicationmodel.h>
#include <node_api.h>
#include <cstdint>

/* WinRT class name for UserNotificationListener activation */
#define TOAST_LISTENER_CLASS_NAME L"Windows.UI.Notifications.Management.UserNotificationListener"

/* Async operation polling constants */
#define ASYNC_ACCESS_TIMEOUT_MS 60000
#define ASYNC_ACCESS_POLL_MS 25

/* WinRT interface typedefs — notification listener */
typedef __x_ABI_CWindows_CUI_CNotifications_CManagement_CIUserNotificationListener ToastListener;
typedef __x_ABI_CWindows_CUI_CNotifications_CManagement_CIUserNotificationListenerStatics ToastListenerStatics;

/* WinRT interface typedefs — notification data */
typedef __x_ABI_CWindows_CUI_CNotifications_CIUserNotification UserNotification;
typedef __x_ABI_CWindows_CApplicationModel_CIAppInfo AppInfo;
typedef __x_ABI_CWindows_CApplicationModel_CIAppDisplayInfo AppDisplayInfo;
typedef __x_ABI_CWindows_CUI_CNotifications_CINotification Notification;
typedef __x_ABI_CWindows_CUI_CNotifications_CINotificationVisual NotificationVisual;
typedef __x_ABI_CWindows_CUI_CNotifications_CINotificationBinding NotificationBinding;
typedef __x_ABI_CWindows_CUI_CNotifications_CIAdaptiveNotificationText AdaptiveNotificationText;

/* WinRT async operation typedefs */
typedef __FIAsyncOperation_1_Windows__CUI__CNotifications__CManagement__CUserNotificationListenerAccessStatus AccessStatusOperation;
typedef __FIAsyncOperation_1___FIVectorView_1_Windows__CUI__CNotifications__CUserNotification NotificationVectorOperation;
typedef __FIVectorView_1_Windows__CUI__CNotifications__CUserNotification NotificationVector;
typedef __FIVectorView_1_Windows__CUI__CNotifications__CAdaptiveNotificationText AdaptiveTextVector;
typedef __FIVector_1_Windows__CUI__CNotifications__CNotificationBinding BindingVector;

/* WinRT enum aliases */
using AccessStatus = ABI::Windows::UI::Notifications::Management::UserNotificationListenerAccessStatus;
using ToastChangedKind = ABI::Windows::UI::Notifications::UserNotificationChangedKind;
using NotificationKinds = ABI::Windows::UI::Notifications::NotificationKinds;

/* Notification changed event data passed from COM callback to JS */
typedef struct ToastChangedEvent {
  char kind[16];
  uint32_t notification_id;
} ToastChangedEvent;

#endif /* TOAST_LISTENER_TYPES_H */
