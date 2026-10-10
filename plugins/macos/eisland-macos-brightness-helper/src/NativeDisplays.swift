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
 * @file NativeDisplays.swift
 * @description DisplayServices、Intel IOKit 与 Apple Silicon DDC/CI 原生亮度目标。
 * @author 鸡哥
 */
import Foundation
import CoreGraphics
import IOKit
import IOKit.graphics
import Darwin
#if arch(x86_64)
import IOKit.i2c
#endif

private typealias BrightnessGetter = @convention(c) (UInt32, UnsafeMutablePointer<Float>) -> Int32
private typealias BrightnessSetter = @convention(c) (UInt32, Float) -> Int32
private typealias DisplayPortGetter = @convention(c) (UInt32) -> io_service_t
private typealias AVCreate = @convention(c) (CFAllocator?, io_service_t) -> Unmanaged<CFTypeRef>?
private typealias AVTransfer = @convention(c) (CFTypeRef, UInt32, UInt32, UnsafeMutableRawPointer, UInt32) -> Int32

/** 动态加载私有符号，系统移除接口时可回退或返回不支持，而非链接失败。 */
private let displayServices = dlopen("/System/Library/PrivateFrameworks/DisplayServices.framework/DisplayServices", RTLD_LAZY | RTLD_LOCAL)
private let ioKit = dlopen("/System/Library/Frameworks/IOKit.framework/IOKit", RTLD_LAZY | RTLD_LOCAL)
#if arch(x86_64)
private let coreGraphics = dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", RTLD_LAZY | RTLD_LOCAL)
#endif

/**
 * 从常驻框架中查找可选函数。
 * @param handle - 框架句柄。
 * @param name - C 符号名。
 * @param type - 精确的 C ABI 函数类型。
 * @returns 可调用函数；框架或符号缺失时为 nil。
 */
private func symbol<T>(_ handle: UnsafeMutableRawPointer?, _ name: String, as type: T.Type) -> T? {
  guard let handle = handle, let address = dlsym(handle, name) else { return nil }
  return unsafeBitCast(address, to: type)
}

/**
 * 枚举系统屏幕，内置屏优先，随后主屏和其他屏幕，最后添加 DDC 硬件回退。
 * @returns 稳定排序的原生亮度目标。
 */
func nativeBrightnessTargets() -> [BrightnessTarget] {
  var count: UInt32 = 0
  guard CGGetOnlineDisplayList(0, nil, &count) == .success, count > 0 else { return [] }
  var displays = [CGDirectDisplayID](repeating: 0, count: Int(count))
  guard CGGetOnlineDisplayList(count, &displays, &count) == .success else { return [] }
  displays = Array(displays.prefix(Int(count)))
  let priority: (CGDirectDisplayID) -> Int = { CGDisplayIsBuiltin($0) != 0 ? 0 : ($0 == CGMainDisplayID() ? 1 : 2) }
  displays.sort { priority($0) == priority($1) ? $0 < $1 : priority($0) < priority($1) }
  let getter = symbol(displayServices, "DisplayServicesGetBrightness", as: BrightnessGetter.self)
  let setter = symbol(displayServices, "DisplayServicesSetBrightness", as: BrightnessSetter.self)
  #if arch(x86_64)
  let displayPort = symbol(coreGraphics, "CGDisplayIOServicePort", as: DisplayPortGetter.self)
  #endif
  var targets: [BrightnessTarget] = []
  for display in displays {
    if let getter = getter, let setter = setter {
      targets.append(BrightnessTarget(id: "display:\(display)", source: "display-services", read: {
        var value: Float = 0
        return getter(display, &value) == 0 ? Double(value) : nil
      }, write: { setter(display, Float($0)) == 0 }))
    }
    #if arch(x86_64)
    // CGDisplayIOServicePort 为系统持有的借用端口；调用方不得释放。
    let service = displayPort?(display) ?? 0
    if service != 0 {
      targets.append(BrightnessTarget(id: "display:\(display)", source: "iokit", read: {
        var value: Float = 0
        return IODisplayGetFloatParameter(service, 0, "brightness" as CFString, &value) == KERN_SUCCESS ? Double(value) : nil
      }, write: { IODisplaySetFloatParameter(service, 0, "brightness" as CFString, Float($0)) == KERN_SUCCESS }))
    }
    #endif
  }
  #if arch(arm64)
  targets += armDDCTargets()
  #elseif arch(x86_64)
  targets += displays.filter { CGDisplayIsBuiltin($0) == 0 }.compactMap { display in
    let framebuffer = displayPort?(display) ?? 0
    guard framebuffer != 0 else { return nil }
    return ddcTarget(id: "display:\(display)") { packet, expectsReply in
      intelDDCExchange(framebuffer, packet: packet, expectsReply: expectsReply)
    }
  }
  #endif
  return targets
}

/**
 * 将 DDC 传输适配为相同的亮度读写目标。
 * @param id - 设备标识。
 * @param exchange - 发送帧并返回回复；写入成功返回空数组。
 * @returns 使用显示器报告的最大值进行缩放的目标。
 */
private func ddcTarget(id: String, exchange: @escaping ([UInt8], Bool) -> [UInt8]?) -> BrightnessTarget {
  var maximum: UInt16 = 0
  return BrightnessTarget(id: id, source: "ddc-ci", read: {
    guard let reply = exchange(brightnessDDCPacket(), true), let values = parseBrightnessDDCReply(reply) else { return nil }
    maximum = values.maximum
    return Double(values.current) / Double(values.maximum)
  }, write: { value in
    guard maximum > 0 else { return false }
    return exchange(brightnessDDCPacket(scaledDDCBrightness(value, maximum: maximum)), false) != nil
  })
}

#if arch(arm64)
/**
 * 枚举 Apple Silicon 外接 DCP 服务；过滤内置屏防止向其发送 DDC 命令。
 * @returns 可尝试 DDC 的外接设备，是否支持由实际 VCP 回复决定。
 */
private func armDDCTargets() -> [BrightnessTarget] {
  guard let create = symbol(ioKit, "IOAVServiceCreateWithService", as: AVCreate.self),
        let write = symbol(ioKit, "IOAVServiceWriteI2C", as: AVTransfer.self),
        let read = symbol(ioKit, "IOAVServiceReadI2C", as: AVTransfer.self) else { return [] }
  var iterator: io_iterator_t = 0
  guard IOServiceGetMatchingServices(kIOMainPortDefault, IOServiceMatching("DCPAVServiceProxy"), &iterator) == KERN_SUCCESS else { return [] }
  defer { IOObjectRelease(iterator) }
  var targets: [BrightnessTarget] = []
  while case let entry = IOIteratorNext(iterator), entry != 0 {
    defer { IOObjectRelease(entry) }
    let location = IORegistryEntryCreateCFProperty(entry, "Location" as CFString, kCFAllocatorDefault, 0)?.takeRetainedValue() as? String
    guard location == "External", let service = create(kCFAllocatorDefault, entry)?.takeRetainedValue() else { continue }
    var registryID: UInt64 = 0
    guard IORegistryEntryGetRegistryEntryID(entry, &registryID) == KERN_SUCCESS else { continue }
    targets.append(ddcTarget(id: "ioreg:\(registryID)") { packet, expectsReply in
      // IOAVService 用 offset 传源地址，查询的 XOR 校验不包含源地址。
      var bytes = Array(packet.dropFirst())
      if expectsReply { bytes[bytes.count - 1] ^= 0x51 }
      usleep(10000)
      guard bytes.withUnsafeMutableBytes({ write(service, 0x37, 0x51, $0.baseAddress!, UInt32($0.count)) }) == 0 else { return nil }
      if !expectsReply { return [] }
      usleep(50000)
      var reply = [UInt8](repeating: 0, count: 11)
      guard reply.withUnsafeMutableBytes({ read(service, 0x37, 0, $0.baseAddress!, UInt32($0.count)) }) == 0 else { return nil }
      return reply
    })
  }
  return targets.sorted { $0.id < $1.id }
}
#endif

#if arch(x86_64)
/**
 * 在 Intel framebuffer 的 I2C 总线上发送亮度帧，确保端口和连接始终释放。
 * @param framebuffer - 系统持有的 framebuffer 端口。
 * @param packet - DDC 帧。
 * @param expectsReply - true 读取 VCP 回复；false 仅写入。
 * @returns 回复数据或写入成功的空数组；传输失败为 nil。
 */
private func intelDDCExchange(_ framebuffer: io_service_t, packet: [UInt8], expectsReply: Bool) -> [UInt8]? {
  var count: IOItemCount = 0
  guard IOFBGetI2CInterfaceCount(framebuffer, &count) == KERN_SUCCESS else { return nil }
  for bus in 0..<count {
    var interface: io_service_t = 0
    guard IOFBCopyI2CInterfaceForBus(framebuffer, bus, &interface) == KERN_SUCCESS else { continue }
    defer { IOObjectRelease(interface) }
    var connection: IOI2CConnectRef?
    guard IOI2CInterfaceOpen(interface, 0, &connection) == KERN_SUCCESS else { continue }
    defer { IOI2CInterfaceClose(connection, 0) }
    let types = IORegistryEntryCreateCFProperty(interface, kIOI2CTransactionTypesKey as CFString, kCFAllocatorDefault, 0)?.takeRetainedValue() as? NSNumber
    let mask = types?.uint64Value ?? 0
    let replyType = mask & (1 << kIOI2CDDCciReplyTransactionType) != 0 ? kIOI2CDDCciReplyTransactionType : kIOI2CSimpleTransactionType
    if expectsReply && mask & (1 << replyType) == 0 { continue }
    var outgoing = packet
    var reply = [UInt8](repeating: 0, count: expectsReply ? 11 : 0)
    usleep(10000)
    let success = outgoing.withUnsafeMutableBytes { sendBuffer in
      reply.withUnsafeMutableBytes { receiveBuffer in
        var request = IOI2CRequest()
        request.sendAddress = 0x6e
        request.sendTransactionType = IOOptionBits(kIOI2CSimpleTransactionType)
        request.sendBuffer = vm_address_t(bitPattern: sendBuffer.baseAddress!)
        request.sendBytes = UInt32(packet.count)
        request.replyAddress = 0x6f
        request.replySubAddress = 0x51
        request.replyTransactionType = IOOptionBits(expectsReply ? replyType : kIOI2CNoTransactionType)
        request.replyBuffer = receiveBuffer.baseAddress.map { vm_address_t(bitPattern: $0) } ?? 0
        request.replyBytes = expectsReply ? 11 : 0
        request.minReplyDelay = 50000000
        return IOI2CSendRequest(connection, 0, &request) == KERN_SUCCESS && request.result == KERN_SUCCESS
      }
    }
    if success && (!expectsReply || parseBrightnessDDCReply(reply) != nil) { return reply }
  }
  return nil
}
#endif
