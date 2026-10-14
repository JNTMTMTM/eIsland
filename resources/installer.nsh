!ifndef EISLAND_INSTALLER_INCLUDED
!define EISLAND_INSTALLER_INCLUDED

!include "LogicLib.nsh"

!ifdef BUILD_UNINSTALLER
  !define EISLAND_PROCESS_FUNCTION un.eIslandProcessAction
!else
  !define EISLAND_PROCESS_FUNCTION eIslandProcessAction
!endif

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
      IntOp $7 $0 | 0x1000 # PROCESS_QUERY_LIMITED_INFORMATION [+ PROCESS_TERMINATE]
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
        ${elseif} $5 == $8
          StrCpy $9 0
          ${if} $0 == 1
            System::Call 'kernel32::TerminateProcess(p r6, i 0) i.r3'
            ${if} $3 == 0
              StrCpy $9 2
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

!macro EISLAND_KILL_PROCESS
  Push $R0
  Push 1
  Call ${EISLAND_PROCESS_FUNCTION}
  Pop $R0
  Pop $R0
!macroend

!macro customCheckAppRunning
  ${if} ${isUpdated}
    Sleep 300
  ${endIf}

  eIslandCheckRunning:
  !insertmacro EISLAND_FIND_PROCESS $R0
  ${if} $R0 == 1
    Goto eIslandNotRunning
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
  !insertmacro EISLAND_KILL_PROCESS
  Sleep 300
  !insertmacro EISLAND_FIND_PROCESS $R0
  ${if} $R0 == 1
    Goto eIslandNotRunning
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
  eIslandNotRunning:
!macroend

!endif
