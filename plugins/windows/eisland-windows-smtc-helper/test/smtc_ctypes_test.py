
import ctypes
import json
import os
import sys

DLL_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "smtc-ctypes",
    "bin",
    "Release",
    "net10.0-windows10.0.19041.0",
    "win-x64",
    "publish",
    "eIslandSmtcCtypes.dll",
)


def load_dll(path: str) -> ctypes.CDLL:
    """加载 DLL"""
    abs_path = os.path.abspath(path)
    if not os.path.exists(abs_path):
        print(f"[FAIL] DLL not found: {abs_path}")
        print("  Run first: npm run build:ctypes")
        sys.exit(1)
    print(f"[OK] Loaded DLL: {abs_path}")
    return ctypes.CDLL(abs_path)


def test_play(dll: ctypes.CDLL) -> None:
    """测试 play"""
    print("\n--- smtc_play() ---")
    result = dll.smtc_play()
    status = "OK" if result == 0 else "FAIL"
    print(f"  Result: {result} ({status})")


def test_pause(dll: ctypes.CDLL) -> None:
    """测试 pause"""
    print("\n--- smtc_pause() ---")
    result = dll.smtc_pause()
    status = "OK" if result == 0 else "FAIL"
    print(f"  Result: {result} ({status})")


def test_next(dll: ctypes.CDLL) -> None:
    """测试 next"""
    print("\n--- smtc_next() ---")
    result = dll.smtc_next()
    status = "OK" if result == 0 else "FAIL"
    print(f"  Result: {result} ({status})")


def test_previous(dll: ctypes.CDLL) -> None:
    """测试 previous"""
    print("\n--- smtc_previous() ---")
    result = dll.smtc_previous()
    status = "OK" if result == 0 else "FAIL"
    print(f"  Result: {result} ({status})")


def test_get_status(dll: ctypes.CDLL) -> dict | None:
    """测试 get_status，返回解析后的 dict"""
    print("\n--- smtc_get_status() ---")
    dll.smtc_get_status.restype = ctypes.c_void_p
    dll.smtc_free_string.argtypes = [ctypes.c_void_p]

    ptr = dll.smtc_get_status()
    if ptr is None:
        print("  [NULL] No active media session")
        return None

    try:
        json_str = ctypes.string_at(ptr).decode("utf-8")
        status = json.loads(json_str)
        print(f"  [OK] Got status:")
        print(f"    Title:      {status.get('title', 'N/A')}")
        print(f"    Artist:     {status.get('artist', 'N/A')}")
        print(f"    Album:      {status.get('albumTitle', 'N/A')}")
        print(f"    Status:     {status.get('playbackStatus', 'N/A')}")
        print(f"    Source:     {status.get('sourceAppUserModelId', 'N/A')}")

        timeline = status.get("timeline")
        if timeline:
            pos = timeline.get("position", 0)
            end = timeline.get("endTime", 0)
            print(f"    Timeline:   {pos:.1f}s / {end:.1f}s")

        controls = status.get("controls")
        if controls:
            enabled = [k for k, v in controls.items() if v]
            print(f"    Controls:   {', '.join(enabled) or 'none'}")

        thumb = status.get("thumbnail")
        print(f"    Thumbnail:  {'(' + str(len(thumb)) + ' chars)' if thumb else 'N/A'}")

        return status
    finally:
        dll.smtc_free_string(ptr)


def main():
    print("=== SMTC ctypes Test ===\n")

    dll = load_dll(DLL_PATH)

    dll.smtc_play.restype = ctypes.c_int
    dll.smtc_pause.restype = ctypes.c_int
    dll.smtc_next.restype = ctypes.c_int
    dll.smtc_previous.restype = ctypes.c_int
    dll.smtc_get_status.restype = ctypes.c_void_p
    dll.smtc_free_string.argtypes = [ctypes.c_void_p]

    # 获取当前状态
    test_get_status(dll)

    # 播放/暂停
    test_play(dll)
    test_pause(dll)

    # 上一首/下一首
    test_next(dll)
    test_previous(dll)

    # 再次获取状态
    test_get_status(dll)

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
