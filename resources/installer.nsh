!ifndef EISLAND_INSTALLER_INCLUDED
!define EISLAND_INSTALLER_INCLUDED

!include "LogicLib.nsh"

!ifdef BUILD_UNINSTALLER
  !define EISLAND_PROCESS_FUNCTION un.eIslandProcessAction
  !define EISLAND_TREE_FUNCTION un.eIslandStopProcessTree
  !define EISLAND_CHILD_FUNCTION un.eIslandCheckChild
!else
  !define EISLAND_PROCESS_FUNCTION eIslandProcessAction
  !define EISLAND_TREE_FUNCTION eIslandStopProcessTree
  !define EISLAND_CHILD_FUNCTION eIslandCheckChild
!endif

# Validate a held child's current parent before using a snapshot PID, and skip
# the installer and its ancestors (an updater can launch Setup as an app child).
# Stack: child PID, parent PID -> 0 = child, 1 = installer ancestor,
# 2 = query failure, 3 = stale snapshot entry.
Function ${EISLAND_CHILD_FUNCTION}
  Exch $0
  Exch
  Exch $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  Push $7
  Push $8
  Push $9
  StrCpy $9 2
  System::Call 'kernel32::CreateToolhelp32Snapshot(i 2, i 0) p.r2'
  ${if} $2 == -1
    Goto eIslandChildDone
  ${endIf}
  System::Alloc 556
  Pop $3
  ${if} $3 == 0
    Goto eIslandChildClose
  ${endIf}
  System::Call '*$3(i 556)'
  System::Call 'kernel32::Process32FirstW(p r2, p r3) i.r4'
  ${doWhile} $4 != 0
    System::Call '*$3(i, i, i.r5, p, i, i, i.r6)'
    ${if} $5 == $1
      ${if} $6 != $0
        StrCpy $9 3
        Goto eIslandChildFree
      ${endIf}
      Goto eIslandChildAncestry
    ${endIf}
    System::Call 'kernel32::Process32NextW(p r2, p r3) i.r4'
  ${loop}
  # The child exited, or the snapshot could not be queried. Neither is safe to kill.
  Goto eIslandChildFree

  eIslandChildAncestry:
  System::Call 'kernel32::GetCurrentProcessId() i.r7'
  eIslandChildParent:
  ${if} $7 == $1
    StrCpy $9 1
    Goto eIslandChildFree
  ${endIf}
  ${if} $7 == 0
    StrCpy $9 0
    Goto eIslandChildFree
  ${endIf}
  System::Call 'kernel32::Process32FirstW(p r2, p r3) i.r4 ?e'
  Pop $8
  ${doWhile} $4 != 0
    System::Call '*$3(i, i, i.r5, p, i, i, i.r6)'
    ${if} $5 == $7
      StrCpy $7 $6
      Goto eIslandChildParent
    ${endIf}
    System::Call 'kernel32::Process32NextW(p r2, p r3) i.r4 ?e'
    Pop $8
  ${loop}
  ${if} $8 == 18
    StrCpy $9 0 # An installer ancestor has already exited.
  ${endIf}
  eIslandChildFree:
  System::Free $3
  eIslandChildClose:
  System::Call 'kernel32::CloseHandle(p r2)'
  eIslandChildDone:
  StrCpy $0 $9
  Pop $9
  Pop $8
  Pop $7
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Exch $0
FunctionEnd

# Stop the held parent first, then take a fresh snapshot of its children. Each
# child is stopped before enumerating its own children, so it cannot spawn an
# unobserved descendant. Keep parent handles open until the whole tree exits.
Function ${EISLAND_TREE_FUNCTION}
  Exch $0 # Verified process handle; caller retains ownership.
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  Push $7
  Push $8
  Push $9
  Push $R0
  Push $R1
  StrCpy $R0 2
  System::Call 'kernel32::GetProcessTimes(p r0, *l .r8, *l .r9, *l .r9, *l .r9) i.r3'
  ${if} $3 == 0
    Goto eIslandTreeDone
  ${endIf}
  System::Call 'kernel32::TerminateProcess(p r0, i 0) i.r3'
  # TerminateProcess is asynchronous, and can fail for an already-exited parent.
  System::Call 'kernel32::WaitForSingleObject(p r0, i 5000) i.r3'
  ${if} $3 != 0
    Goto eIslandTreeDone
  ${endIf}
  System::Call 'kernel32::GetProcessId(p r0) i.r5'
  System::Call 'kernel32::CreateToolhelp32Snapshot(i 2, i 0) p.r1'
  ${if} $1 == -1
    Goto eIslandTreeDone
  ${endIf}
  System::Alloc 556
  Pop $2
  ${if} $2 == 0
    Goto eIslandTreeClose
  ${endIf}
  StrCpy $R0 0
  System::Call '*$2(i 556)'
  System::Call 'kernel32::Process32FirstW(p r1, p r2) i.r3 ?e'
  Pop $R1
  ${doWhile} $3 != 0
    System::Call '*$2(i, i, i.r4, p, i, i, i.r6)'
    ${if} $6 == $5
    ${andIf} $4 != $5
      System::Call 'kernel32::OpenProcess(i 0x101001, i 0, i r4) p.r7 ?e'
      Pop $R1
      ${if} $7 == 0
        ${if} $R1 != 87
          StrCpy $R0 2
        ${endIf}
      ${else}
        System::Call 'kernel32::GetProcessTimes(p r7, *l .r9, *l .r6, *l .r6, *l .r6) i.r3'
        ${if} $3 == 0
          StrCpy $R0 2
        ${else}
          System::Int64Op $9 < $8
          Pop $3
          ${if} $3 == 0 # Exclude children of an older process that used this PID.
            Push $4
            Push $5
            Call ${EISLAND_CHILD_FUNCTION}
            Pop $3
            ${if} $3 == 0
              Push $7
              Call ${EISLAND_TREE_FUNCTION}
              Pop $3
            ${endIf}
            ${if} $3 == 2
              StrCpy $R0 2
            ${endIf}
          ${endIf}
        ${endIf}
        System::Call 'kernel32::CloseHandle(p r7)'
      ${endIf}
    ${endIf}
    System::Call 'kernel32::Process32NextW(p r1, p r2) i.r3 ?e'
    Pop $R1
  ${loop}
  ${if} $R1 != 18
    StrCpy $R0 2
  ${endIf}
  System::Free $2
  eIslandTreeClose:
  System::Call 'kernel32::CloseHandle(p r1)'
  eIslandTreeDone:
  StrCpy $0 $R0
  Pop $R1
  Pop $R0
  Pop $9
  Pop $8
  Pop $7
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Exch $0
FunctionEnd

# Returns 0 for a matching process, 1 when none are found, or 2 on query failure.
# Both installer and uninstaller use native APIs: shell policies, WMIC availability
# and special characters in the installation path must not affect detection.
Function ${EISLAND_PROCESS_FUNCTION}
  Exch $0 # 0 = find, 1 = terminate
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  Push $7
  Push $8
  Push $9

  StrCpy $9 1
  # APP_EXECUTABLE_FILENAME is defined after this include in common.nsh.
  GetFullPathName $8 "$INSTDIR\${PRODUCT_FILENAME}.exe"
  System::Call 'kernel32::CreateToolhelp32Snapshot(i 2, i 0) p.r1'
  ${if} $1 == -1
    StrCpy $9 2
    Goto eIslandProcessDone
  ${endIf}

  # electron-builder uses the 32-bit Unicode NSIS stub (PROCESSENTRY32W = 556).
  System::Alloc 556
  Pop $2
  ${if} $2 == 0
    StrCpy $9 2
    Goto eIslandCloseSnapshot
  ${endIf}
  System::Call '*$2(i 556)'
  System::Call 'kernel32::Process32FirstW(p r1, p r2) i.r3 ?e'
  Pop $7

  ${do}
    ${if} $3 == 0
      ${if} $7 != 18 # ERROR_NO_MORE_FILES
        StrCpy $9 2
      ${endIf}
      ${break}
    ${endIf}
    System::Call '*$2(i, i, i.r4, p, i, i, i, i, i, &w260.r5)'
    System::Call 'kernel32::GetCurrentProcessId() i.r7'
    ${if} $4 != $7
    ${andIf} $5 == "${PRODUCT_FILENAME}.exe"
      # Query and terminate through the same handle so a reused PID cannot
      # cause an unrelated process to be terminated between those operations.
      IntOp $7 $0 | 0x101000 # QUERY_LIMITED_INFORMATION | SYNCHRONIZE [+ TERMINATE]
      System::Call 'kernel32::OpenProcess(i r7, i 0, i r4) p.r6 ?e'
      Pop $7
      ${if} $6 == 0
        ${if} $7 != 87 # ERROR_INVALID_PARAMETER: process already exited
          StrCpy $9 2
        ${endIf}
      ${else}
        StrCpy $7 ${NSIS_MAX_STRLEN}
        System::Call 'kernel32::QueryFullProcessImageNameW(p r6, i 0, w .r5, *i r7) i.r3'
        ${if} $3 == 0
          # The app may exit after OpenProcess during an update. Its handle can
          # remain valid while its image path is no longer available.
          System::Call 'kernel32::GetExitCodeProcess(p r6, *i .r7) i.r3'
          ${if} $3 == 0
          ${orIf} $7 == 259 # STILL_ACTIVE
            StrCpy $9 2
          ${endIf}
        ${else}
          System::Call 'kernel32::CompareStringOrdinal(w r5, i -1, w r8, i -1, i 1) i.r3'
          ${if} $3 == 0
            StrCpy $9 2
          ${elseif} $3 == 2 # CSTR_EQUAL, ignoring case using Windows ordinal rules.
          ${if} $9 != 2
            StrCpy $9 0
          ${endIf}
          ${if} $0 == 1
            Push $6
            Call ${EISLAND_TREE_FUNCTION}
            Pop $3
            ${if} $3 == 2
              StrCpy $9 2
            ${endIf}
          ${endIf}
          ${endIf}
        ${endIf}
        System::Call 'kernel32::CloseHandle(p r6)'
        ${if} $9 == 0
        ${andIf} $0 == 0
          ${break}
        ${endIf}
      ${endIf}
    ${endIf}
    System::Call 'kernel32::Process32NextW(p r1, p r2) i.r3 ?e'
    Pop $7
  ${loop}

  System::Free $2
  eIslandCloseSnapshot:
  System::Call 'kernel32::CloseHandle(p r1)'
  eIslandProcessDone:
  StrCpy $0 $9
  Pop $9
  Pop $8
  Pop $7
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Exch $0
FunctionEnd

!macro EISLAND_FIND_PROCESS RETURN
  Push 0
  Call ${EISLAND_PROCESS_FUNCTION}
  Pop ${RETURN}
!macroend

!macro EISLAND_KILL_PROCESS RETURN
  Push 1
  Call ${EISLAND_PROCESS_FUNCTION}
  Pop ${RETURN}
!macroend

!macro customCheckAppRunning
  StrCpy $R2 0
  ${if} ${isUpdated}
    Sleep 300
  ${endIf}

  eIslandCheckRunning:
  !insertmacro EISLAND_FIND_PROCESS $R0
  ${if} $R0 == 1
    Goto eIslandVerifyNotRunning
  ${elseif} $R0 == 2
    # An unreadable process must not be mistaken for a successful shutdown.
    Goto eIslandCheckFailed
  ${endIf}

  ${if} ${isUpdated}
    Sleep 1000
  ${else}
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK eIslandDoStopProcess
    SetErrorLevel 2
    Quit
  ${endIf}

  eIslandDoStopProcess:
  DetailPrint "$(appClosing)"
  StrCpy $R1 0
  eIslandCheckProcessLoop:
  !insertmacro EISLAND_KILL_PROCESS $R0
  ${if} $R0 == 2
    # A parent may already be gone while a descendant could not be stopped.
    # Do not retry a root-only search and forget that failed descendant.
    MessageBox MB_OK|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDOK
    SetErrorLevel 2
    Quit
  ${endIf}
  Sleep 300
  !insertmacro EISLAND_FIND_PROCESS $R0
  ${if} $R0 == 1
    Goto eIslandVerifyNotRunning
  ${endIf}
  IntOp $R1 $R1 + 1
  ${if} $R1 < 2
    Sleep 1000
    Goto eIslandCheckProcessLoop
  ${endIf}

  eIslandCheckFailed:
  MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY eIslandCheckRunning
  SetErrorLevel 2
  Quit
  eIslandVerifyNotRunning:
  # The first snapshot may predate a newly launched instance. Always take a
  # fresh snapshot at the hand-off to file modification, even if none was found.
  ${if} $R2 == 0
    StrCpy $R2 1
    Goto eIslandCheckRunning
  ${endIf}
!macroend

# Use electron-builder's original extraction macro, with one final native
# process/tree check immediately before it starts replacing application files.
!macro EISLAND_DECLARE_FINAL_CHECK
  !ifdef BUILD_UNINSTALLER
    Function un.eIslandFinalProcessCheck
      !insertmacro customCheckAppRunning
    FunctionEnd
  !else
    Function eIslandFinalProcessCheck
      !insertmacro customCheckAppRunning
    FunctionEnd
  !endif
!macroend

!macro customHeader
  !insertmacro EISLAND_DECLARE_FINAL_CHECK
  !ifndef BUILD_UNINSTALLER
    !include "${BUILD_RESOURCES_DIR}\nsis\installUtil.nsh"
    !include "${BUILD_RESOURCES_DIR}\nsis\installer.nsh"
    # The later section include must hit the guarded wrapper, which restores
    # electron-builder's template cwd before continuing the normal install.
    !addincludedir "${PROJECT_DIR}\node_modules\app-builder-lib\templates\nsis"
    !cd "${BUILD_RESOURCES_DIR}\nsis"
  !endif
!macroend

# Assisted uninstall can wait on its UI after onInit's check. Recheck at the
# actual removal section, immediately before electron-builder removes files.
!ifdef BUILD_UNINSTALLER
!macro customUnInstall
  Call un.eIslandFinalProcessCheck
!macroend
!endif

!endif
