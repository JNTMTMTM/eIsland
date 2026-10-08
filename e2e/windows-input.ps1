# /*
#  * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
#  * https://github.com/JNTMTMTM/eIsland
#  *
#  * Copyright (C) 2026 JNTMTMTM
#  * Copyright (C) 2026 pyisland.com
#  *
#  * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
#  *
#  * This program is free software: you can redistribute it and/or modify
#  * it under the terms of the GNU General Public License as published by
#  * the Free Software Foundation, either version 3 of the License, or
#  * (at your option) any later version.
#  *
#  * This program is distributed in the hope that it will be useful,
#  * but WITHOUT ANY WARRANTY; without even the implied warranty of
#  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  * GNU General Public License for more details.
#  */
param(
  [ValidateSet('cursor', 'move', 'shortcut', 'region')][string]$Action,
  [int]$X,
  [int]$Y,
  [long]$WindowHandle,
  [ValidateRange(1, 24)][int]$FunctionKey = 11
)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class E2EWindows {
  [StructLayout(LayoutKind.Sequential)]
  public struct Point { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)]
  public struct Rect { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)]
  public struct MouseInput {
    public int X, Y; public uint Data, Flags, Time; public UIntPtr Extra;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct KeyInput {
    public ushort Key, Scan; public uint Flags, Time; public UIntPtr Extra;
  }
  [StructLayout(LayoutKind.Explicit)]
  public struct InputUnion {
    [FieldOffset(0)] public MouseInput Mouse;
    [FieldOffset(0)] public KeyInput Keyboard;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct Input { public uint Type; public InputUnion Data; }

  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool GetCursorPos(out Point point);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
  [DllImport("user32.dll")] public static extern int GetWindowRgn(IntPtr window, IntPtr region);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateRectRgn(int left, int top, int right, int bottom);
  [DllImport("gdi32.dll")] public static extern int GetRgnBox(IntPtr region, out Rect rect);
  [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr obj);
  [DllImport("user32.dll", SetLastError=true)] private static extern uint SendInput(uint count, Input[] inputs, int size);

  // DPI 感知与 Electron 的 dipToScreenPoint/Rect 对齐，避免缩放显示器上的坐标错位。
  public static void Initialize() { SetThreadDpiAwarenessContext(new IntPtr(-4)); }
  public static Point Cursor() {
    Point point;
    if (!GetCursorPos(out point)) throw new Win32Exception(Marshal.GetLastWin32Error());
    return point;
  }
  public static void Move(int x, int y) {
    if (!SetCursorPos(x, y)) throw new Win32Exception(Marshal.GetLastWin32Error());
  }
  public static Rect Region(long handle) {
    Rect window, regionBounds;
    if (!GetWindowRect(new IntPtr(handle), out window)) throw new Win32Exception(Marshal.GetLastWin32Error());
    IntPtr region = CreateRectRgn(0, 0, 0, 0);
    try {
      if (GetWindowRgn(new IntPtr(handle), region) == 0) throw new Exception("Window has no native clipping region.");
      if (GetRgnBox(region, out regionBounds) != 2) throw new Exception("Expected a rectangular window region.");
      return new Rect { Left = window.Left + regionBounds.Left, Top = window.Top + regionBounds.Top,
        Right = window.Left + regionBounds.Right, Bottom = window.Top + regionBounds.Bottom };
    } finally { DeleteObject(region); }
  }
  public static void Shortcut(int functionKey) {
    ushort[] keys = { 0x11, 0x12, 0x10, (ushort)(0x70 + functionKey - 1) };
    Input[] inputs = new Input[keys.Length * 2];
    for (int i = 0; i < keys.Length; i++) {
      inputs[i] = new Input { Type = 1, Data = new InputUnion { Keyboard = new KeyInput { Key = keys[i] } } };
      inputs[keys.Length + i] = new Input { Type = 1,
        Data = new InputUnion { Keyboard = new KeyInput { Key = keys[keys.Length - 1 - i], Flags = 2 } } };
    }
    uint sent = SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(Input)));
    if (sent != inputs.Length) {
      // 部分插入时仍尝试释放修饰键，防止失败用例污染桌面输入状态。
      Input[] releases = new Input[keys.Length];
      Array.Copy(inputs, keys.Length, releases, 0, keys.Length);
      SendInput((uint)releases.Length, releases, Marshal.SizeOf(typeof(Input)));
      throw new Win32Exception(Marshal.GetLastWin32Error(), "SendInput did not insert the complete shortcut.");
    }
  }
}
'@
[E2EWindows]::Initialize()
switch ($Action) {
  'cursor' { $point = [E2EWindows]::Cursor(); @{ x = $point.X; y = $point.Y } | ConvertTo-Json -Compress }
  'move' { [E2EWindows]::Move($X, $Y) }
  'shortcut' { [E2EWindows]::Shortcut($FunctionKey) }
  'region' {
    $region = [E2EWindows]::Region($WindowHandle)
    @{ x = $region.Left; y = $region.Top; width = $region.Right - $region.Left; height = $region.Bottom - $region.Top } | ConvertTo-Json -Compress
  }
}
