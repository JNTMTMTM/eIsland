!ifndef EISLAND_INSTALLER_INCLUDED
!define EISLAND_INSTALLER_INCLUDED

# customCheckAppRunning prevents electron-builder from including this file.
!include "getProcessInfo.nsh"
Var pid

# The default electron-builder check treats every process whose executable
# path starts with $INSTDIR as eIsland. This also matches the old uninstaller
# and helper processes during an overwrite installation.
!macro EISLAND_FIND_PROCESS RETURN
  ${if} $IsPowerShellAvailable == 0
    nsExec::Exec `"$PowerShellPath" -NoProfile -NonInteractive -C "$$found = Get-CimInstance -ClassName Win32_Process | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath -ieq [System.IO.Path]::GetFullPath('$INSTDIR\${APP_EXECUTABLE_FILENAME}') }; if ($$found) { exit 0 } else { exit 1 }"`
    Pop ${RETURN}
  ${else}
    # Use wmic path-aware lookup — only matches processes under $INSTDIR,
    # so unrelated installs of the same executable are not treated as running.
    # A temp batch file avoids WQL backslash-escaping issues in inline commands.
    nsExec::ExecToStack `cmd /C "echo wmic process where "ExecutablePath='$INSTDIR\${APP_EXECUTABLE_FILENAME}'" get ProcessId | findstr /R "^[0-9]"" > "$PLUGINSDIR\_efind.bat"`
    Pop $R0
    nsExec::ExecToStack `"$PLUGINSDIR\_efind.bat"`
    Pop ${RETURN}
  ${endIf}
!macroend

!macro EISLAND_KILL_PROCESS
  ${if} $IsPowerShellAvailable == 0
    nsExec::Exec `"$PowerShellPath" -NoProfile -NonInteractive -C "Get-CimInstance -ClassName Win32_Process | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath -ieq [System.IO.Path]::GetFullPath('$INSTDIR\${APP_EXECUTABLE_FILENAME}') } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"`
  ${else}
    # Find PID by exact executable path, then kill by PID — avoids terminating
    # unrelated processes that happen to share the same image name.
    nsExec::ExecToStack `cmd /C "echo for /f "tokens=*" %%A in ('wmic process where "ExecutablePath='$INSTDIR\${APP_EXECUTABLE_FILENAME}'" get ProcessId ^| findstr /R "^[0-9]"') do taskkill /T /F /PID %%A" > "$PLUGINSDIR\_ekill.bat"`
    Pop $R0
    nsExec::Exec `"$PLUGINSDIR\_ekill.bat"`
  ${endIf}
  Pop $R0
!macroend

!macro customCheckAppRunning
  !insertmacro IS_POWERSHELL_AVAILABLE
  ${GetProcessInfo} 0 $pid $1 $2 $3 $4
  ${if} $3 != "${APP_EXECUTABLE_FILENAME}"
    ${if} ${isUpdated}
      # Give the application a short opportunity to exit on an update.
      Sleep 300
    ${endIf}

    !insertmacro EISLAND_FIND_PROCESS $R0
    ${if} $R0 == 0
      ${if} ${isUpdated}
        Sleep 1000
        Goto eIslandDoStopProcess
      ${endIf}
      MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK eIslandDoStopProcess
      Quit

      eIslandDoStopProcess:
      DetailPrint "$(appClosing)"
      !insertmacro EISLAND_KILL_PROCESS

      Sleep 300
      StrCpy $R1 0

      eIslandCheckProcessLoop:
      IntOp $R1 $R1 + 1
      !insertmacro EISLAND_FIND_PROCESS $R0
      ${if} $R0 == 0
        Sleep 1000
        !insertmacro EISLAND_KILL_PROCESS
        !insertmacro EISLAND_FIND_PROCESS $R0
        ${if} $R0 == 0
          DetailPrint `Waiting for "${PRODUCT_NAME}" to close.`
          Sleep 2000
        ${else}
          Goto eIslandNotRunning
        ${endIf}
      ${else}
        Goto eIslandNotRunning
      ${endIf}

      ${if} $R1 > 1
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY eIslandCheckProcessLoop
        Quit
      ${else}
        Goto eIslandCheckProcessLoop
      ${endIf}

      eIslandNotRunning:
    ${endIf}
  ${endIf}
!macroend

!endif
