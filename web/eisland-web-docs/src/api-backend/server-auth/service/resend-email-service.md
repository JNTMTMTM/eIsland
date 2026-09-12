---
title: ResendEmailService
---

# ResendEmailService

:::info
`@Service` that sends verification code emails via the Resend API with scene-specific subjects and HTML templates.
:::

## Overview

Wraps the Resend SDK to deliver verification code emails. Builds scene-specific email subjects and HTML bodies containing the verification code, scene label, and trace ID for debugging.

## Key Methods

| Method | Description |
|---|---|
| `sendVerificationCode(email, scene, code, traceId)` | Send a verification code email via Resend API |

## Email Subjects by Scene

| Scene | Subject |
|---|---|
| `REGISTER` | eIsland Registration Verification Code |
| `LOGIN` | eIsland Login Verification Code |
| `RESET_PASSWORD` | eIsland Password Reset Verification Code |
| `CHANGE_EMAIL` | eIsland Email Change Verification Code |
| `UNREGISTER` | eIsland Account Deletion Verification Code |

## Email Template

The HTML template includes:
- Scene label (e.g. "Register Account", "Login")
- Verification code (5-minute validity)
- Trace ID for debugging

## Configuration Properties

| Property | Env / YAML Key | Default | Description |
|---|---|---|---|
| API Key | `resend.api-key` | (empty) | Resend API key (required) |
| From Address | `resend.from` | (empty) | Sender email address (required) |

:::warning
Throws `IllegalStateException` if `resend.api-key` or `resend.from` is missing.
:::

## Dependencies

- Resend Java SDK (`com.resend.Resend`)
