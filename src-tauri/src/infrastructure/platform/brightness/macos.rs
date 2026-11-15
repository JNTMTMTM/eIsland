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

//! macOS 亮度控制：DisplayServices 负责系统面板，IOKit 与 DDC/CI 作为回退。

use super::ddc::{self, Reply};
use libloading::Library;
use objc2_core_foundation::CFString;
use objc2_core_graphics::{CGDisplayIsBuiltin, CGError, CGGetOnlineDisplayList, CGMainDisplayID};
use objc2_io_kit::{IOObjectRelease, IORegistryEntryCreateCFProperty};
use std::{ptr::null_mut, sync::OnceLock};

struct DisplayServices {
    get: unsafe extern "C" fn(u32, *mut f32) -> i32,
    set: unsafe extern "C" fn(u32, f32) -> i32,
    _framework: Library,
}

impl DisplayServices {
    fn load() -> Option<Self> {
        // 运行时解析私有系统符号，缺失时仍可回退到 IOKit。
        unsafe {
            let framework = Library::new(
                "/System/Library/PrivateFrameworks/DisplayServices.framework/DisplayServices",
            )
            .ok()?;
            Some(Self {
                get: *framework.get(b"DisplayServicesGetBrightness\0").ok()?,
                set: *framework.get(b"DisplayServicesSetBrightness\0").ok()?,
                _framework: framework,
            })
        }
    }
}

fn displays() -> Vec<u32> {
    let mut count = 0;
    if unsafe { CGGetOnlineDisplayList(0, null_mut(), &mut count) } != CGError::Success
        || count == 0
    {
        return Vec::new();
    }
    let mut ids = vec![0; count as usize];
    if unsafe { CGGetOnlineDisplayList(count, ids.as_mut_ptr(), &mut count) } != CGError::Success {
        return Vec::new();
    }
    ids.truncate(count as usize);
    let main = CGMainDisplayID();
    ids.sort_unstable_by_key(|id| (!CGDisplayIsBuiltin(*id), *id != main, *id));
    ids
}

#[derive(Clone, Copy)]
enum Panel {
    DisplayServices(&'static DisplayServices, u32),
    #[cfg(target_arch = "x86_64")]
    IoKit(u32),
}

impl Panel {
    fn raw_level(self) -> Option<f32> {
        let mut level = 0.;
        let status = match self {
            Self::DisplayServices(api, id) => unsafe { (api.get)(id, &mut level) },
            #[cfg(target_arch = "x86_64")]
            Self::IoKit(port) => unsafe {
                objc2_io_kit::IODisplayGetFloatParameter(
                    port,
                    0,
                    Some(&CFString::from_str("brightness")),
                    &mut level,
                )
            },
        };
        (status == 0 && (0.0..=1.0).contains(&level)).then_some(level)
    }

    fn set(self, percent: u8) -> bool {
        let level = f32::from(percent) / 100.;
        let status = match self {
            Self::DisplayServices(api, id) => unsafe { (api.set)(id, level) },
            #[cfg(target_arch = "x86_64")]
            Self::IoKit(port) => unsafe {
                objc2_io_kit::IODisplaySetFloatParameter(
                    port,
                    0,
                    Some(&CFString::from_str("brightness")),
                    level,
                )
            },
        };
        status == 0
    }
}

fn panels(ids: &[u32]) -> impl Iterator<Item = Panel> + '_ {
    static DISPLAY_SERVICES: OnceLock<Option<DisplayServices>> = OnceLock::new();
    let api = DISPLAY_SERVICES.get_or_init(DisplayServices::load).as_ref();
    ids.iter().copied().flat_map(move |id| {
        let display_services = api.map(|api| Panel::DisplayServices(api, id));
        #[cfg(target_arch = "x86_64")]
        let io_kit = intel::framebuffer(id).map(Panel::IoKit);
        #[cfg(not(target_arch = "x86_64"))]
        let io_kit = None;
        [display_services, io_kit].into_iter().flatten()
    })
}

struct IoObject(u32);

impl Drop for IoObject {
    fn drop(&mut self) {
        let _ = IOObjectRelease(self.0);
    }
}

fn property(
    port: u32,
    name: &str,
) -> Option<objc2_core_foundation::CFRetained<objc2_core_foundation::CFType>> {
    let key = CFString::from_str(name);
    unsafe { IORegistryEntryCreateCFProperty(port, Some(&key), None, 0) }
}

#[cfg(target_arch = "aarch64")]
use arm::Target as DdcTarget;
#[cfg(target_arch = "x86_64")]
use intel::Target as DdcTarget;

fn ddc_targets(ids: &[u32]) -> Vec<DdcTarget> {
    #[cfg(target_arch = "aarch64")]
    {
        let _ = ids;
        arm::targets()
    }
    #[cfg(target_arch = "x86_64")]
    {
        intel::targets(ids).collect()
    }
}

fn ddc_range(target: &DdcTarget) -> Option<(u16, u16)> {
    let mut reply = Reply::default();
    target
        .exchange(&ddc::packet(None), Some(&mut reply))
        .then(|| ddc::range(&reply))
        .flatten()
}

fn ddc_get(ids: &[u32]) -> Option<u8> {
    ddc_targets(ids).iter().find_map(|target| {
        let (current, maximum) = ddc_range(target)?;
        Some((f64::from(current) * 100. / f64::from(maximum)).round() as u8)
    })
}

/// 向全部可读的 DDC/CI 外接显示器写入亮度，按显示器返回各自是否成功。
fn ddc_set(ids: &[u32], percent: u8) -> Vec<bool> {
    ddc_targets(ids)
        .iter()
        .filter_map(|target| {
            let (_, maximum) = ddc_range(target)?;
            let value = (f64::from(percent) * f64::from(maximum) / 100.).round() as u16;
            Some(target.exchange(&ddc::packet(Some(value)), None))
        })
        .collect()
}

/// 读取当前亮度
/// @description 优先读取内置屏或主显示器的系统面板接口，否则读取首个可读的 DDC/CI 外接显示器。
/// @returns 亮度百分比（0~100）；没有可读显示器时返回 `None`
pub(crate) fn get() -> Option<u8> {
    let ids = displays();
    let level = panels(&ids).find_map(Panel::raw_level);
    level
        .map(|level| (f64::from(level) * 100.).round() as u8)
        .or_else(|| ddc_get(&ids))
}

/// 将亮度写入全部支持亮度调节的显示器
/// @description 每台显示器依次尝试可读的面板接口，任一接口写入成功即视为该显示器成功；
/// 没有面板接口的显示器再经 DDC/CI 写入。不支持亮度调节的显示器跳过，不计为失败。
/// @param percent - 目标亮度百分比（0~100）
/// @returns 至少有一台可调显示器且全部写入成功时为 `true`；部分失败或无可调显示器时为 `false`
pub(crate) fn set(percent: u8) -> bool {
    let ids = displays();
    let mut outcomes = Vec::new();
    let mut unpaneled = Vec::new();
    for id in &ids {
        let mut readable = panels(std::slice::from_ref(id))
            .filter(|panel| panel.raw_level().is_some())
            .peekable();
        if readable.peek().is_none() {
            unpaneled.push(*id);
            continue;
        }
        outcomes.push(readable.any(|panel| panel.set(percent)));
    }
    // Apple 芯片的 DDC/CI 目标无法映射回显示器 ID，因此会遍历全部外接目标；
    // 只有 DDC 读取成功的目标才会写入，同时支持两种接口的显示器会写入相同百分比。
    outcomes.extend(ddc_set(&unpaneled, percent));
    !outcomes.is_empty() && outcomes.into_iter().all(|updated| updated)
}

#[cfg(target_arch = "aarch64")]
mod arm {
    use super::{property, IoObject, Library, OnceLock, Reply};
    use objc2_core_foundation::{CFAllocator, CFRetained, CFString, CFType};
    use objc2_io_kit::{
        kIOMainPortDefault, IOIteratorNext, IORegistryEntryGetRegistryEntryID,
        IOServiceGetMatchingServices, IOServiceMatching,
    };
    use std::{ffi::c_void, ptr::NonNull, thread::sleep, time::Duration};

    type Create = unsafe extern "C" fn(Option<&CFAllocator>, u32) -> Option<NonNull<CFType>>;
    type Transfer = unsafe extern "C" fn(&CFType, u32, u32, *mut c_void, u32) -> i32;

    struct AvService {
        create: Create,
        read: Transfer,
        write: Transfer,
        _framework: Library,
    }

    impl AvService {
        fn load() -> Option<Self> {
            unsafe {
                let framework =
                    Library::new("/System/Library/Frameworks/IOKit.framework/IOKit").ok()?;
                Some(Self {
                    create: *framework.get(b"IOAVServiceCreateWithService\0").ok()?,
                    read: *framework.get(b"IOAVServiceReadI2C\0").ok()?,
                    write: *framework.get(b"IOAVServiceWriteI2C\0").ok()?,
                    _framework: framework,
                })
            }
        }
    }

    pub(super) struct Target {
        id: u64,
        service: CFRetained<CFType>,
        api: &'static AvService,
    }

    impl Target {
        fn open(entry: u32, api: &'static AvService) -> Option<Self> {
            // 只有外接显示器代理支持 DDC/CI，禁止向内置屏发送 I2C。
            let location = property(entry, "Location")?.downcast::<CFString>().ok()?;
            if location.to_string() != "External" {
                return None;
            }
            let mut id = 0;
            if unsafe { IORegistryEntryGetRegistryEntryID(entry, &mut id) } != 0 {
                return None;
            }
            let service = unsafe { CFRetained::from_raw((api.create)(None, entry)?) };
            Some(Self { id, service, api })
        }

        /// 发送 DDC/CI 帧，可选读取应答
        /// @param packet - `ddc::packet` 生成的完整帧
        /// @param reply - 传入时读取应答到该缓冲区；`None` 表示只写入
        /// @returns 写入（及读取）均成功时为 `true`
        pub(super) fn exchange(&self, packet: &[u8], reply: Option<&mut Reply>) -> bool {
            // IOAVService 以 DDC 源地址作为偏移量，读取请求的校验和不包含该地址。
            let mut bytes = packet[1..].to_vec();
            if reply.is_some() {
                *bytes.last_mut().unwrap() ^= 0x51;
            }
            sleep(Duration::from_millis(10));
            if unsafe {
                (self.api.write)(
                    &self.service,
                    0x37,
                    0x51,
                    bytes.as_mut_ptr().cast(),
                    bytes.len() as u32,
                )
            } != 0
            {
                return false;
            }
            reply.is_none_or(|reply| {
                sleep(Duration::from_millis(50));
                unsafe {
                    (self.api.read)(
                        &self.service,
                        0x37,
                        0,
                        reply.as_mut_ptr().cast(),
                        reply.len() as u32,
                    ) == 0
                }
            })
        }
    }

    /// 枚举外接显示器的 DDC/CI 目标
    /// @returns 按注册表 ID 排序的目标；IOAVService 不可用时为空
    pub(super) fn targets() -> Vec<Target> {
        static AV_SERVICE: OnceLock<Option<AvService>> = OnceLock::new();
        let mut targets = Vec::new();
        let Some(api) = AV_SERVICE.get_or_init(AvService::load).as_ref() else {
            return targets;
        };
        let Some(matching) = (unsafe { IOServiceMatching(c"DCPAVServiceProxy".as_ptr()) }) else {
            return targets;
        };
        // IOServiceGetMatchingServices 接收 CFDictionary；IOServiceMatching 返回的
        // 可变字典是 CFDictionary 的 Core Foundation 子类型。
        let matching = unsafe { CFRetained::cast_unchecked(matching) };
        let mut iterator = 0;
        if unsafe {
            IOServiceGetMatchingServices(kIOMainPortDefault, Some(matching), &mut iterator)
        } != 0
        {
            return targets;
        }
        let iterator = IoObject(iterator);
        loop {
            let entry = IOIteratorNext(iterator.0);
            if entry == 0 {
                break;
            }
            let entry = IoObject(entry);
            targets.extend(Target::open(entry.0, api));
        }
        targets.sort_unstable_by_key(|target| target.id);
        targets
    }
}

#[cfg(target_arch = "x86_64")]
mod intel {
    use super::{property, IoObject, Library, OnceLock, Reply};
    use objc2_core_foundation::CFNumber;
    use objc2_core_graphics::CGDisplayIsBuiltin;
    use std::{
        ffi::c_void,
        ptr::{null_mut, NonNull},
        thread::sleep,
        time::Duration,
    };

    type DisplayPort = unsafe extern "C" fn(u32) -> u32;

    /// 查询显示器对应的帧缓冲服务端口
    /// @param id - CoreGraphics 显示器 ID
    /// @returns 帧缓冲端口；查询失败时为 `None`
    pub(super) fn framebuffer(id: u32) -> Option<u32> {
        static PORT: OnceLock<Option<(Library, DisplayPort)>> = OnceLock::new();
        let (_, get_port) = PORT
            .get_or_init(|| unsafe {
                let framework =
                    Library::new("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics")
                        .ok()?;
                let get_port = *framework.get(b"CGDisplayIOServicePort\0").ok()?;
                Some((framework, get_port))
            })
            .as_ref()?;
        // 显示器服务端口归 CoreGraphics 所有，此处只借用不释放。
        let service = unsafe { get_port(id) };
        (service != 0).then_some(service)
    }

    // 对应 IOKit/i2c/IOI2CInterface.h 中 64 位 IOI2CRequest 的 ABI。
    #[repr(C, packed(4))]
    #[derive(Default)]
    struct I2cRequest {
        send_transaction: u32,
        reply_transaction: u32,
        send_address: u32,
        reply_address: u32,
        send_subaddress: u8,
        reply_subaddress: u8,
        reserved_a: [u8; 2],
        min_reply_delay: u64,
        result: i32,
        flags: u32,
        pad_a: u32,
        send_length: u32,
        reserved_b: [u32; 2],
        pad_b: u32,
        reply_length: u32,
        completion: usize,
        send_buffer: usize,
        reply_buffer: usize,
        reserved_c: [u32; 10],
    }

    const _: () = assert!(
        std::mem::size_of::<I2cRequest>() == 124
            && std::mem::offset_of!(I2cRequest, send_buffer) == 68
    );

    #[link(name = "IOKit", kind = "framework")]
    extern "C" {
        fn IOFBGetI2CInterfaceCount(framebuffer: u32, count: *mut u32) -> i32;
        fn IOFBCopyI2CInterfaceForBus(framebuffer: u32, bus: u32, interface: *mut u32) -> i32;
        fn IOI2CInterfaceOpen(interface: u32, flags: u32, connection: *mut *mut c_void) -> i32;
        fn IOI2CInterfaceClose(connection: NonNull<c_void>, flags: u32) -> i32;
        fn IOI2CSendRequest(
            connection: NonNull<c_void>,
            flags: u32,
            request: *mut I2cRequest,
        ) -> i32;
    }

    const SIMPLE: u32 = 1;
    const DDC_REPLY: u32 = 2;

    pub(super) struct Target {
        connection: NonNull<c_void>,
        reply_transaction: u32,
    }

    impl Drop for Target {
        fn drop(&mut self) {
            unsafe { IOI2CInterfaceClose(self.connection, 0) };
        }
    }

    impl Target {
        fn open(framebuffer: u32, bus: u32) -> Option<Self> {
            let mut interface = 0;
            if unsafe { IOFBCopyI2CInterfaceForBus(framebuffer, bus, &mut interface) } != 0 {
                return None;
            }
            let interface = IoObject(interface);
            let transactions = property(interface.0, "IOI2CTransactionTypes")?
                .downcast::<CFNumber>()
                .ok()?
                .as_i64()?;
            let reply_transaction = [DDC_REPLY, SIMPLE]
                .into_iter()
                .find(|kind| transactions & (1 << kind) != 0)?;
            let mut connection = null_mut();
            if unsafe { IOI2CInterfaceOpen(interface.0, 0, &mut connection) } != 0 {
                return None;
            }
            Some(Self {
                connection: NonNull::new(connection)?,
                reply_transaction,
            })
        }

        /// 发送 DDC/CI 帧，可选读取应答
        /// @param packet - `ddc::packet` 生成的完整帧
        /// @param reply - 传入时读取应答到该缓冲区；`None` 表示只写入
        /// @returns 请求成功且应答长度符合预期时为 `true`
        pub(super) fn exchange(&self, packet: &[u8], reply: Option<&mut Reply>) -> bool {
            let mut outgoing = packet.to_vec();
            let mut request = I2cRequest {
                send_transaction: SIMPLE,
                send_address: 0x6e,
                send_buffer: outgoing.as_mut_ptr() as usize,
                send_length: outgoing.len() as u32,
                ..I2cRequest::default()
            };
            let expected = if let Some(reply) = reply {
                request.reply_address = 0x6f;
                request.reply_subaddress = 0x51;
                request.reply_transaction = self.reply_transaction;
                request.reply_buffer = reply.as_mut_ptr() as usize;
                request.reply_length = reply.len() as u32;
                request.min_reply_delay = 50_000_000;
                request.reply_length
            } else {
                0
            };
            sleep(Duration::from_millis(10));
            let sent = unsafe { IOI2CSendRequest(self.connection, 0, &mut request) } == 0;
            sent && request.result == 0 && request.reply_length == expected
        }
    }

    /// 枚举给定外接显示器的全部 I2C 总线目标
    /// @param ids - CoreGraphics 显示器 ID，内置屏会被过滤
    /// @returns 可打开的 DDC/CI 目标
    pub(super) fn targets(ids: &[u32]) -> impl Iterator<Item = Target> + '_ {
        ids.iter()
            .copied()
            .filter(|id| !CGDisplayIsBuiltin(*id))
            .filter_map(framebuffer)
            .flat_map(|framebuffer| {
                let mut count = 0;
                if unsafe { IOFBGetI2CInterfaceCount(framebuffer, &mut count) } != 0 {
                    count = 0;
                }
                (0..count).filter_map(move |bus| Target::open(framebuffer, bus))
            })
    }
}
