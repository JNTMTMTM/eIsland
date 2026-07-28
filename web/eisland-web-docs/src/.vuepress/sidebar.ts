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
 * @file sidebar.ts
 * @description VuePress 侧边栏配置
 * @author 鸡哥
 */

import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
  ],
  "/introduction/": [
    {
      text: "Introduction",
      icon: "info",
      collapsible: false,
      children: [
        "intro/project-overview.md",
        "intro/dependencies.md",
        "intro/backend-dependencies.md",
        "intro/coc.md",
      ],
    },
    {
      text: "Tech Stack",
      icon: "book-atlas",
      collapsible: false,
      children: [
        "tech-stack/frontend-tech-stack.md",
        "tech-stack/backend-tech-stack.md",
        "tech-stack/plugins-tech-stack.md",
      ],
    },
    {
      text: "Frontend Architecture",
      icon: "building",
      collapsible: false,
      children: [
        "frontend-arch/process-model.md",
        "frontend-arch/states.md",
        "frontend-arch/shape-modes.md",
        "frontend-arch/cli.md",
        "frontend-arch/electron-windows.md",
      ],
    },
    {
      text: "Backend Architecture",
      icon: "server",
      collapsible: false,
      children: [
        "backend-arch/server-model.md",
        "backend-arch/mysql-schema.md",
        "backend-arch/redis-schema.md",
        "backend-arch/rabbitmq-schema.md",
      ],
    },
  ],
  "/api-plugins/": [
    {
      text: "Windows Brightness Helper",
      icon: "sun",
      collapsible: true,
      children: [
        "display-graphics/brightness-helper/brightness-info.md",
        "display-graphics/brightness-helper/get-brightness.md",
        "display-graphics/brightness-helper/set-brightness.md",
        "display-graphics/brightness-helper/brightness-monitor.md",
      ],
    },
    {
      text: "Windows Fullscreen Detector",
      icon: "maximize",
      collapsible: true,
      children: [
        "display-graphics/fullscreen-detector/native-rect.md",
        "display-graphics/fullscreen-detector/native-monitor-info.md",
        "display-graphics/fullscreen-detector/fullscreen-window-info.md",
        "display-graphics/fullscreen-detector/get-foreground-fullscreen-window.md",
        "display-graphics/fullscreen-detector/get-fullscreen-windows.md",
        "display-graphics/fullscreen-detector/is-any-fullscreen-window.md",
      ],
    },
    {
      text: "Windows Screenshot Helper",
      icon: "camera",
      collapsible: true,
      children: [
        "display-graphics/screenshot-helper/screenshot-result.md",
        "display-graphics/screenshot-helper/visible-window-bounds.md",
        "display-graphics/screenshot-helper/capture-primary-display-png.md",
        "display-graphics/screenshot-helper/get-visible-windows.md",
        "display-graphics/screenshot-helper/get-last-error.md",
      ],
    },
    {
      text: "Windows Volume Helper",
      icon: "volume-high",
      collapsible: true,
      children: [
        "display-graphics/volume-helper/get-volume.md",
        "display-graphics/volume-helper/set-volume.md",
        "display-graphics/volume-helper/volume-monitor.md",
      ],
    },
    {
      text: "Windows Bluetooth Helper",
      icon: "server",
      collapsible: true,
      children: [
        "connectivity/bluetooth-helper/bluetooth-device-info.md",
        "connectivity/bluetooth-helper/get-paired-devices.md",
        "connectivity/bluetooth-helper/get-connected-devices.md",
        "connectivity/bluetooth-helper/get-all-devices.md",
        "connectivity/bluetooth-helper/get-device.md",
        "connectivity/bluetooth-helper/bluetooth-monitor.md",
      ],
    },
    {
      text: "Windows WiFi Helper",
      icon: "wifi",
      collapsible: true,
      children: [
        "connectivity/wifi-helper/connectivity-level.md",
        "connectivity/wifi-helper/wifi-info.md",
        "connectivity/wifi-helper/get-wifi-info.md",
        "connectivity/wifi-helper/wifi-monitor.md",
      ],
    },
    {
      text: "Windows Power Helper",
      icon: "battery-half",
      collapsible: true,
      children: [
        "system-power/power-helper/battery-status.md",
        "system-power/power-helper/power-supply-status.md",
        "system-power/power-helper/energy-saver-status.md",
        "system-power/power-helper/power-info.md",
        "system-power/power-helper/get-power-info.md",
        "system-power/power-helper/power-monitor.md",
      ],
    },
    {
      text: "Windows Performance Monitor",
      icon: "gauge-high",
      collapsible: true,
      children: [
        "system-power/performance-monitor/temperature-category.md",
        "system-power/performance-monitor/cpu-snapshot.md",
        "system-power/performance-monitor/memory-snapshot.md",
        "system-power/performance-monitor/temperature-reading.md",
        "system-power/performance-monitor/temperature-snapshot.md",
        "system-power/performance-monitor/hardware-device.md",
        "system-power/performance-monitor/hardware-list-snapshot.md",
        "system-power/performance-monitor/get-cpu.md",
        "system-power/performance-monitor/get-memory.md",
        "system-power/performance-monitor/get-temperature.md",
        "system-power/performance-monitor/get-hardware-list.md",
      ],
    },
    {
      text: "Windows Processes Attacker",
      icon: "skull-crossbones",
      collapsible: true,
      children: [
        "system-power/processes-attacker/process-close-result.md",
        "system-power/processes-attacker/process-failure.md",
        "system-power/processes-attacker/close-process.md",
        "system-power/processes-attacker/close-processes.md",
      ],
    },
    {
      text: "Windows Application Icon Helper",
      icon: "icons",
      collapsible: true,
      children: [
        "system-power/application-icon-helper/icon-result.md",
        "system-power/application-icon-helper/get-icon-by-process-name.md",
        "system-power/application-icon-helper/get-icon-by-pid.md",
        "system-power/application-icon-helper/get-icon-by-path.md",
        "system-power/application-icon-helper/get-icon-by-shortcut-path.md",
      ],
    },
    {
      text: "Windows Hardware Info Helper",
      icon: "microchip",
      collapsible: true,
      children: [
        "system-power/hardware-info-helper/cpu-info.md",
        "system-power/hardware-info-helper/gpu-info.md",
        "system-power/hardware-info-helper/memory-slot-info.md",
        "system-power/hardware-info-helper/disk-info.md",
        "system-power/hardware-info-helper/network-adapter-info.md",
        "system-power/hardware-info-helper/bluetooth-device-info.md",
        "system-power/hardware-info-helper/motherboard-info.md",
        "system-power/hardware-info-helper/monitor-info.md",
        "system-power/hardware-info-helper/get-cpu-info.md",
        "system-power/hardware-info-helper/get-gpu-info.md",
        "system-power/hardware-info-helper/get-memory-info.md",
        "system-power/hardware-info-helper/get-disk-info.md",
        "system-power/hardware-info-helper/get-network-adapter-info.md",
        "system-power/hardware-info-helper/get-bluetooth-devices.md",
        "system-power/hardware-info-helper/get-motherboard-info.md",
        "system-power/hardware-info-helper/get-monitor-info.md",
      ],
    },
    {
      text: "Windows SMTC Helper",
      icon: "music",
      collapsible: true,
      children: [
        "media-notifications/smtc-helper/timeline-properties.md",
        "media-notifications/smtc-helper/playback-controls.md",
        "media-notifications/smtc-helper/media-status.md",
        "media-notifications/smtc-helper/command-result.md",
        "media-notifications/smtc-helper/timestamp-info.md",
        "media-notifications/smtc-helper/media-props.md",
        "media-notifications/smtc-helper/playback-info.md",
        "media-notifications/smtc-helper/timeline-props.md",
        "media-notifications/smtc-helper/session-snapshot.md",
        "media-notifications/smtc-helper/play.md",
        "media-notifications/smtc-helper/pause.md",
        "media-notifications/smtc-helper/next.md",
        "media-notifications/smtc-helper/previous.md",
        "media-notifications/smtc-helper/get-status.md",
        "media-notifications/smtc-helper/get-timestamp.md",
        "media-notifications/smtc-helper/seek.md",
        "media-notifications/smtc-helper/stop.md",
        "media-notifications/smtc-helper/set-shuffle.md",
        "media-notifications/smtc-helper/set-repeat-mode.md",
        "media-notifications/smtc-helper/set-playback-rate.md",
        "media-notifications/smtc-helper/smtc-monitor.md",
      ],
    },
    {
      text: "Windows Toast Listener",
      icon: "bell",
      collapsible: true,
      children: [
        "media-notifications/toast-listener/toast-access-status.md",
        "media-notifications/toast-listener/toast-notification-change-kind.md",
        "media-notifications/toast-listener/toast-notification-changed-event.md",
        "media-notifications/toast-listener/toast-notification-snapshot.md",
        "media-notifications/toast-listener/request-access.md",
        "media-notifications/toast-listener/get-access-status.md",
        "media-notifications/toast-listener/get-notifications.md",
        "media-notifications/toast-listener/start-listening.md",
        "media-notifications/toast-listener/stop-listening.md",
        "media-notifications/toast-listener/is-listening.md",
        "media-notifications/toast-listener/enable-suppression.md",
        "media-notifications/toast-listener/disable-suppression.md",
        "media-notifications/toast-listener/is-suppression-enabled.md",
      ],
    },
  ],
  "/api-backend/": [
    {
      text: "eisland Agent Services Server",
      icon: "robot",
      collapsible: true,
      children: [
        {
          text: "eASS Config",
          icon: "gear",
          collapsible: true,
          children: [
            "server-agent/config/agent-billing-redis.md",
            "server-agent/config/agent-pricing-redis.md",
            "server-agent/config/agent-usage-redis.md",
            "server-agent/config/agent-billing-mq.md",
            "server-agent/config/agent-stt-websocket.md",
            "server-agent/config/mihtnelis-agent-properties.md",
            "server-agent/config/mihtnelis-prompt-builder.md",
            "server-agent/config/edoc-prompt-builder.md",
            "server-agent/config/r1pxc-prompt-builder.md",
          ],
        },
        {
          text: "eASS Controller",
          icon: "plug",
          collapsible: true,
          children: [
            "server-agent/controller/mihtnelis-agent-controller.md",
            "server-agent/controller/admin-agent-controller.md",
            "server-agent/controller/admin-tmt-controller.md",
            "server-agent/controller/toolbox-translate-controller.md",
            "server-agent/controller/agent-realtime-stt-controller.md",
          ],
        },
        {
          text: "eASS Job",
          icon: "clock",
          collapsible: true,
          children: [
            "server-agent/job/README.md",
          ],
        },
        {
          text: "eASS Message Queue",
          icon: "envelope",
          collapsible: true,
          children: [
            "server-agent/mq/README.md",
          ],
        },
        {
          text: "eASS Service",
          icon: "server",
          collapsible: true,
          children: [
            "server-agent/service/README.md",
          ],
        },
        {
          text: "eASS Utils",
          icon: "wrench",
          collapsible: true,
          children: [
            "server-agent/utils/README.md",
          ],
        },
        {
          text: "eASS Data Types",
          icon: "database",
          collapsible: true,
          children: [
            "server-agent/data-types/README.md",
          ],
        },
      ],
    },
    {
      text: "eisland Auth Services Server",
      icon: "key",
      collapsible: true,
      children: [
        {
          text: "eAuSS Config",
          icon: "gear",
          collapsible: true,
          children: [
            "server-auth/config/verification-redis.md",
            "server-auth/config/security-config.md",
            "server-auth/config/email-verification-mq.md",
          ],
        },
        {
          text: "eAuSS Controller",
          icon: "plug",
          collapsible: true,
          children: [
            "server-auth/controller/auth-controller.md",
            "server-auth/controller/email-verification-controller.md",
            "server-auth/controller/issue-feedback-controller.md",
            "server-auth/controller/admin-email-dlq-controller.md",
          ],
        },
        {
          text: "eAuSS Service",
          icon: "server",
          collapsible: true,
          children: [
            "server-auth/service/email-verification-service.md",
            "server-auth/service/issue-feedback-service.md",
            "server-auth/service/resend-email-service.md",
            "server-auth/service/slider-captcha-service.md",
          ],
        },
        {
          text: "eAuSS Entity",
          icon: "table",
          collapsible: true,
          children: [
            "server-auth/entity/email-dispatch-dlq-log.md",
          ],
        },
        {
          text: "eAuSS Mapper",
          icon: "database",
          collapsible: true,
          children: [
            "server-auth/mapper/email-dispatch-dlq-log-mapper.md",
            "server-auth/mapper/issue-feedback-mapper.md",
          ],
        },
        {
          text: "eAuSS Message Queue",
          icon: "envelope",
          collapsible: true,
          children: [
            "server-auth/mq/email-code-dispatch-consumer.md",
          ],
        },
        {
          text: "eAuSS Security",
          icon: "shield-halved",
          collapsible: true,
          children: [
            "server-auth/security/jwt-authentication-filter.md",
            "server-auth/security/client-version-gate-filter.md",
            "server-auth/security/replay-protection-filter.md",
            "server-auth/security/json-access-denied-handler.md",
            "server-auth/security/json-authentication-entry-point.md",
          ],
        },
        {
          text: "eAuSS Rate Limit",
          icon: "gauge",
          collapsible: true,
          children: [
            "server-auth/ratelimit/auth-rate-limiter.md",
          ],
        },
        {
          text: "eAuSS Utils",
          icon: "wrench",
          collapsible: true,
          children: [
            "server-auth/util/jwt-util.md",
          ],
        },
      ],
    },
    {
      text: "eisland Payment Services Server",
      icon: "credit-card",
      collapsible: true,
      children: [
        {
          text: "ePSS Config",
          icon: "gear",
          collapsible: true,
          children: [
            "server-payment/config/alipay-properties.md",
            "server-payment/config/wechat-pay-properties.md",
            "server-payment/config/payment-redis.md",
            "server-payment/config/payment-mq.md",
          ],
        },
        {
          text: "ePSS Controller",
          icon: "plug",
          collapsible: true,
          children: [
            "server-payment/controller/user-payment-controller.md",
            "server-payment/controller/admin-payment-controller.md",
            "server-payment/controller/alipay-notify-controller.md",
            "server-payment/controller/wechat-pay-notify-controller.md",
          ],
        },
        {
          text: "ePSS Job",
          icon: "clock",
          collapsible: true,
          children: [
            "server-payment/job/payment-job.md",
          ],
        },
        {
          text: "ePSS Message Queue",
          icon: "envelope",
          collapsible: true,
          children: [
            "server-payment/mq/payment-notify-consumer.md",
            "server-payment/mq/payment-receipt-dispatch-consumer.md",
          ],
        },
        {
          text: "ePSS Service",
          icon: "server",
          collapsible: true,
          children: [
            "server-payment/service/payment-service.md",
            "server-payment/service/alipay-notify-service.md",
            "server-payment/service/alipay-sdk-client.md",
            "server-payment/service/wechat-pay-client.md",
            "server-payment/service/wechat-pay-notify-service.md",
            "server-payment/service/payment-receipt-email-service.md",
            "server-payment/service/payment-channel.md",
          ],
        },
        {
          text: "ePSS Entity",
          icon: "table",
          collapsible: true,
          children: [
            "server-payment/entity/payment-order.md",
            "server-payment/entity/payment-transaction.md",
            "server-payment/entity/payment-pricing-config.md",
            "server-payment/entity/payment-notify-log.md",
            "server-payment/entity/payment-dlq-log.md",
          ],
        },
        {
          text: "ePSS Mapper",
          icon: "database",
          collapsible: true,
          children: [
            "server-payment/mapper/payment-order-mapper.md",
            "server-payment/mapper/payment-transaction-mapper.md",
            "server-payment/mapper/payment-pricing-config-mapper.md",
            "server-payment/mapper/payment-notify-log-mapper.md",
            "server-payment/mapper/payment-dlq-log-mapper.md",
          ],
        },
      ],
    },
    {
      text: "eisland User Services Server",
      icon: "users",
      collapsible: true,
      children: [
        {
          text: "eUSS Config",
          icon: "gear",
          collapsible: true,
          children: [
            "server-user/config/admin-bootstrap-runner.md",
            "server-user/config/announcement-redis.md",
            "server-user/config/identity-redis.md",
            "server-user/config/identity-material-mq.md",
            "server-user/config/alipay-identity-properties.md",
            "server-user/config/totp-security-redis.md",
            "server-user/config/upload-rate-redis.md",
            "server-user/config/user-ban-redis.md",
            "server-user/config/toolbox-software-redis.md",
            "server-user/config/wallpaper-detail-bloom-redis.md",
          ],
        },
        {
          text: "eUSS Controller",
          icon: "plug",
          collapsible: true,
          children: [
            "server-user/controller/user-controller.md",
            "server-user/controller/user-admin-controller.md",
            "server-user/controller/app-user-controller.md",
            "server-user/controller/announcement-controller.md",
            "server-user/controller/identity-verification-controller.md",
            "server-user/controller/identity-admin-controller.md",
            "server-user/controller/toolbox-software-controller.md",
            "server-user/controller/wallpaper-user-controller.md",
            "server-user/controller/wallpaper-admin-controller.md",
            "server-user/controller/wallpaper-tag-controller.md",
          ],
        },
        {
          text: "eUSS Service",
          icon: "server",
          collapsible: true,
          children: [
            "server-user/service/user-service.md",
            "server-user/service/announcement-config-service.md",
            "server-user/service/identity-verification-service.md",
            "server-user/service/alipay-identity-client.md",
            "server-user/service/totp-security-service.md",
            "server-user/service/user-ban-bloom-service.md",
            "server-user/service/toolbox-software-service.md",
            "server-user/service/static-asset-url-service.md",
            "server-user/service/wallpaper-market-service.md",
            "server-user/service/wallpaper-detail-bloom-service.md",
            "server-user/service/wallpaper-tag-service.md",
          ],
        },
        {
          text: "eUSS Policy",
          icon: "scale-balanced",
          collapsible: true,
          children: [
            "server-user/policy/username-policy.md",
            "server-user/policy/password-policy.md",
            "server-user/policy/password-hash-service.md",
            "server-user/policy/gender-policy.md",
          ],
        },
        {
          text: "eUSS Entity",
          icon: "table",
          collapsible: true,
          children: [
            "server-user/entity/user.md",
            "server-user/entity/announcement-config.md",
            "server-user/entity/identity-verification.md",
            "server-user/entity/toolbox-software.md",
            "server-user/entity/toolbox-translate-pricing.md",
            "server-user/entity/wallpaper-asset.md",
            "server-user/entity/wallpaper-tag.md",
            "server-user/entity/agent-model-pricing.md",
            "server-user/entity/agent-usage-stats.md",
            "server-user/entity/agent-billing-dlq-log.md",
            "server-user/entity/user-daily-active-stat.md",
          ],
        },
        {
          text: "eUSS Event",
          icon: "bolt",
          collapsible: true,
          children: [
            "server-user/event/pro-balance-grant-event.md",
          ],
        },
        {
          text: "eUSS Mapper",
          icon: "database",
          collapsible: true,
          children: [
            "server-user/mapper/user-mapper.md",
            "server-user/mapper/announcement-config-mapper.md",
            "server-user/mapper/identity-verification-mapper.md",
            "server-user/mapper/toolbox-software-mapper.md",
            "server-user/mapper/toolbox-translate-pricing-mapper.md",
            "server-user/mapper/wallpaper-market-mapper.md",
            "server-user/mapper/wallpaper-tag-mapper.md",
            "server-user/mapper/agent-model-pricing-mapper.md",
            "server-user/mapper/agent-usage-stats-mapper.md",
            "server-user/mapper/agent-billing-dlq-log-mapper.md",
          ],
        },
        {
          text: "eUSS Message Queue",
          icon: "envelope",
          collapsible: true,
          children: [
            "server-user/mq/identity-material-upload-consumer.md",
          ],
        },
      ],
    },
    {
      text: "eisland Mini Game Services Server",
      icon: "gamepad",
      collapsible: true,
      children: [
        {
          text: "eMGSS Config",
          icon: "gear",
          collapsible: true,
          children: [
            "server-mini-game/config/mini-game-redis.md",
            "server-mini-game/config/mini-game-score-mq.md",
          ],
        },
        {
          text: "eMGSS Controller",
          icon: "plug",
          collapsible: true,
          children: [
            "server-mini-game/controller/mini-game-score-controller.md",
          ],
        },
        {
          text: "eMGSS Service",
          icon: "server",
          collapsible: true,
          children: [
            "server-mini-game/service/mini-game-score-service.md",
          ],
        },
        {
          text: "eMGSS Entity",
          icon: "table",
          collapsible: true,
          children: [
            "server-mini-game/entity/mini-game-score.md",
            "server-mini-game/entity/mini-game-score-dlq-log.md",
          ],
        },
        {
          text: "eMGSS Mapper",
          icon: "database",
          collapsible: true,
          children: [
            "server-mini-game/mapper/mini-game-score-mapper.md",
            "server-mini-game/mapper/mini-game-score-dlq-log-mapper.md",
          ],
        },
        {
          text: "eMGSS Message Queue",
          icon: "envelope",
          collapsible: true,
          children: [
            "server-mini-game/mq/score-upsert-consumer.md",
            "server-mini-game/mq/score-upsert-producer.md",
          ],
        },
      ],
    },
    {
      text: "eisland Service Status Server",
      icon: "server",
      collapsible: true,
      children: [
        {
          text: "eSSS Controller",
          icon: "plug",
          collapsible: true,
          children: [
            "server-service-status/controller/service-status-controller.md",
          ],
        },
        {
          text: "eSSS Service",
          icon: "server",
          collapsible: true,
          children: [
            "server-service-status/service/service-status-service.md",
          ],
        },
        {
          text: "eSSS Entity",
          icon: "table",
          collapsible: true,
          children: [
            "server-service-status/entity/service-status.md",
          ],
        },
        {
          text: "eSSS Mapper",
          icon: "database",
          collapsible: true,
          children: [
            "server-service-status/mapper/service-status-mapper.md",
          ],
        },
      ],
    },
    {
      text: "eisland Upload Services Server",
      icon: "upload",
      collapsible: true,
      children: [
        {
          text: "eUpSS Config",
          icon: "gear",
          collapsible: true,
          children: [
            "server-upload/config/upload-security-redis.md",
            "server-upload/config/object-replication-mq.md",
          ],
        },
        {
          text: "eUpSS Controller",
          icon: "plug",
          collapsible: true,
          children: [
            "server-upload/controller/upload-controller.md",
          ],
        },
        {
          text: "eUpSS Service",
          icon: "server",
          collapsible: true,
          children: [
            "server-upload/service/object-storage-client.md",
            "server-upload/service/object-storage-router.md",
            "server-upload/service/cos-storage-service.md",
            "server-upload/service/r2-storage-service.md",
            "server-upload/service/oss-service.md",
            "server-upload/service/feedback-r2-storage-service.md",
            "server-upload/service/wallpaper-r2-storage-service.md",
            "server-upload/service/object-outbox-relay-service.md",
            "server-upload/service/object-replication-task-service.md",
            "server-upload/service/object-replication-backfill-service.md",
            "server-upload/service/upload-rate-limiter.md",
          ],
        },
        {
          text: "eUpSS Mapper",
          icon: "database",
          collapsible: true,
          children: [
            "server-upload/mapper/object-outbox-mapper.md",
            "server-upload/mapper/object-replication-task-mapper.md",
            "server-upload/mapper/object-replication-checkpoint-mapper.md",
            "server-upload/mapper/object-replication-backfill-mapper.md",
          ],
        },
        {
          text: "eUpSS Message Queue",
          icon: "envelope",
          collapsible: true,
          children: [
            "server-upload/mq/object-replication-consumer.md",
          ],
        },
      ],
    },
    {
      text: "eisland Version Services Server",
      icon: "tag",
      collapsible: true,
      children: [
        {
          text: "eVSS Config",
          icon: "gear",
          collapsible: true,
          children: [
            "server-version/config/version-bloom-redis.md",
          ],
        },
        {
          text: "eVSS Controller",
          icon: "plug",
          collapsible: true,
          children: [
            "server-version/controller/version-controller.md",
          ],
        },
        {
          text: "eVSS Service",
          icon: "server",
          collapsible: true,
          children: [
            "server-version/service/app-version-service.md",
            "server-version/service/version-app-bloom-service.md",
          ],
        },
        {
          text: "eVSS Entity",
          icon: "table",
          collapsible: true,
          children: [
            "server-version/entity/app-version.md",
          ],
        },
        {
          text: "eVSS Mapper",
          icon: "database",
          collapsible: true,
          children: [
            "server-version/mapper/app-version-mapper.md",
          ],
        },
      ],
    },
    {
      text: "eisland Weather Services Server",
      icon: "cloud",
      collapsible: true,
      children: [
        {
          text: "eWSS Config",
          icon: "gear",
          collapsible: true,
          children: [
            "server-weather/config/qweather-redis.md",
          ],
        },
        {
          text: "eWSS Controller",
          icon: "plug",
          collapsible: true,
          children: [
            "server-weather/controller/user-weather-controller.md",
            "server-weather/controller/admin-weather-controller.md",
          ],
        },
        {
          text: "eWSS Service",
          icon: "server",
          collapsible: true,
          children: [
            "server-weather/service/qweather-service.md",
          ],
        },
      ],
    },
    {
      text: "eisland App Services Server",
      icon: "server",
      collapsible: true,
      children: [
        {
          text: "eApSS Config",
          icon: "gear",
          collapsible: true,
          children: [
            "server-app/README.md",
          ],
        },
      ],
    },
    {
      text: "eisland Common Services Server",
      icon: "toolbox",
      collapsible: true,
      children: [
        {
          text: "eCSS Utils",
          icon: "wrench",
          collapsible: true,
          children: [
            "server-common/README.md",
          ],
        },
      ],
    },
  ],
  "/api-frontend/": [
    {
      text: "API Frontend",
      icon: "display",
      collapsible: false,
      children: [],
    },
  ],
  "/developer/": [
    {
      text: "Environment Setup",
      icon: "globe",
      collapsible: false,
      children: [
        "environment-setup/frontend-setup.md",
        "environment-setup/backend-setup.md",
        "environment-setup/plugin-setup.md",
      ],
    },
    {
      text: "Git Operations",
      icon: "code-branch",
      collapsible: false,
      children: [
        "git-operations/local-operations.md",
        "git-operations/github-operations.md",
      ],
    },
    {
      text: "Development Commands",
      icon: "terminal",
      collapsible: false,
      children: [
        "commands/dev-commands.md",
        "commands/test-commands.md",
        "commands/package-commands.md",
        "commands/quality-commands.md",
        "commands/release-commands.md",
        "commands/esa-commands.md",
        "commands/plugin-commands.md",
      ],
    },
    {
      text: "Code Quality",
      icon: "check-double",
      collapsible: false,
      children: [
        "code-quality/code-review.md",
        "code-quality/comment-quality.md",
      ],
    },
  ],
});
