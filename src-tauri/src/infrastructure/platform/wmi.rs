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

//! Bounded local Windows hardware queries with caller-thread COM ownership.

use super::ComApartment;
use windows::{
    core::{BSTR, PCWSTR},
    Win32::System::{
        Com::{
            CoCreateInstance, CoSetProxyBlanket, CLSCTX_INPROC_SERVER, EOAC_NONE,
            RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE,
        },
        Rpc::{RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE},
        Variant::VARIANT,
        Wmi::{
            IWbemClassObject, IWbemLocator, IWbemServices, WbemLocator,
            WBEM_FLAG_CONNECT_USE_MAX_WAIT, WBEM_FLAG_FORWARD_ONLY, WBEM_FLAG_RETURN_IMMEDIATELY,
        },
    },
};

const WMI_TIMEOUT_MS: i32 = 1000;
const ROW_LIMIT: usize = 128;

pub(super) fn with_service<T>(operation: impl FnOnce(&IWbemServices) -> Option<T>) -> Option<T> {
    let _apartment = ComApartment::enter()?;
    unsafe {
        let locator: IWbemLocator =
            CoCreateInstance(&WbemLocator, None, CLSCTX_INPROC_SERVER).ok()?;
        let empty = BSTR::new();
        let service = locator
            .ConnectServer(
                &BSTR::from(r"root\wmi"),
                &empty,
                &empty,
                &empty,
                WBEM_FLAG_CONNECT_USE_MAX_WAIT.0,
                &empty,
                None,
            )
            .ok()?;
        CoSetProxyBlanket(
            &service,
            RPC_C_AUTHN_WINNT,
            RPC_C_AUTHZ_NONE,
            None,
            RPC_C_AUTHN_LEVEL_CALL,
            RPC_C_IMP_LEVEL_IMPERSONATE,
            None,
            EOAC_NONE,
        )
        .ok()?;
        operation(&service)
    }
}

pub(super) fn instances(service: &IWbemServices, query: &str) -> Vec<IWbemClassObject> {
    let Ok(cursor) = (unsafe {
        service.ExecQuery(
            &BSTR::from("WQL"),
            &BSTR::from(query),
            WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
            None,
        )
    }) else {
        return Vec::new();
    };
    let mut rows = Vec::new();
    for _ in 0..ROW_LIMIT {
        let mut entry = [None];
        let mut count = 0;
        let status = unsafe { cursor.Next(WMI_TIMEOUT_MS, &mut entry, &mut count) };
        if status.is_err() || count == 0 {
            break;
        }
        rows.extend(entry[0].take());
    }
    rows
}

pub(super) fn property(entry: &IWbemClassObject, name: PCWSTR) -> Option<VARIANT> {
    let mut value = VARIANT::default();
    unsafe { entry.Get(name, 0, &mut value, None, None).ok()? };
    Some(value)
}
