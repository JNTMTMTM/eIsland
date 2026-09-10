---
title: PasswordPolicy
---

# PasswordPolicy

:::info
Utility class enforcing password strength requirements: 8-128 characters, must contain both letters and digits, no whitespace.
:::

## Overview

A stateless policy class that validates password strength at registration and password-change time.

## Constants

| Constant | Value | Description |
|---|---|---|
| `MIN_LENGTH` | `8` | Minimum password length |
| `MAX_LENGTH` | `128` | Maximum password length |

## Validation Rules

| Rule | Error Message |
|---|---|
| Must not be null or blank | `"Password cannot be empty"` |
| Minimum 8 characters | `"Password must be at least 8 characters"` |
| Maximum 128 characters | `"Password must not exceed 128 characters"` |
| No whitespace characters | `"Password cannot contain whitespace"` |
| Must contain at least one letter | `"Password must contain both letters and numbers"` |
| Must contain at least one digit | `"Password must contain both letters and numbers"` |

## Methods

| Method | Return | Description |
|---|---|---|
| `validate(password)` | `String \| null` | Returns error message if invalid, `null` if valid |
