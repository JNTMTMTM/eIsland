---
title: PaymentReceiptEmailService
---

# PaymentReceiptEmailService

:::info
Sends payment receipt emails using the Resend email API.
:::

## Overview

`PaymentReceiptEmailService` generates and sends HTML payment receipt emails after successful payments. It uses the Resend SDK (`com.resend.Resend`) for email delivery. The service is conditionally enabled based on whether the Resend API key and sender address are configured.

## Methods

| Method | Description |
|---|---|
| `isEnabled()` | Check if Resend API key and sender address are configured |
| `sendPaymentReceipt(toEmail, outTradeNo, ...)` | Send a payment receipt email |

## Configuration Properties

| Property | Env Variable | Description |
|---|---|---|
| `resend.api-key` | - | Resend API authentication key |
| `resend.from` | - | Sender email address |

## Email Content

The receipt email includes:

| Field | Source |
|---|---|
| Order Number | `outTradeNo` |
| Payment Channel | `channel` (WECHAT / ALIPAY) |
| Transaction ID | `transactionId` |
| Amount | `amountFen` converted to yuan |
| Currency | `currency` (default: CNY) |
| Payment Time | `paidAt` formatted as `yyyy-MM-dd HH:mm:ss` |
| Expiration Time | `expireAt` formatted as `yyyy-MM-dd HH:mm:ss` |
| Product Code | `productCode` |

## Email Format

- Subject: `eIsland Payment Receipt - {outTradeNo}`
- Body: HTML table with payment details
- Language: Chinese (zh-CN)

:::tip
If `resend.api-key` or `resend.from` is not configured, `isEnabled()` returns `false` and receipt sending is silently skipped.
:::
