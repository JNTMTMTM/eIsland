# The extraction function needs these upstream helpers before the install
# section. Guard the later template include so each helper is defined once.
!ifndef EISLAND_INSTALL_UTIL_INCLUDED
!define EISLAND_INSTALL_UTIL_INCLUDED
!include "${PROJECT_DIR}\node_modules\app-builder-lib\templates\nsis\include\installUtil.nsh"

Var eIslandSavedTemp
Var eIslandSavedTmp
Var eIslandUninstallTempChanged

# 旧卸载器将文件迁到 $PLUGINSDIR\old-install，额外的路径长度可能超过
# MAX_PATH，却被上游显示为“应用无法关闭”。仅为旧卸载进程缩短临时路径，
# 保留其文件回滚、用户数据保护和退出码检查。
Function eIslandPrepareUninstallTemp
  Push $0
  Push $1
  Push $2
  StrCpy $eIslandUninstallTempChanged 0
  GetFullPathName /SHORT $0 "$PROFILE"
  ${if} $0 == ""
    Goto eIslandUninstallTempReady
  ${endIf}
  StrLen $1 $0
  StrLen $2 $TEMP
  ${if} $1 >= $2
    Goto eIslandUninstallTempReady
  ${endIf}

  # NSIS 会在此目录创建并清理独立的 ns*.tmp；不把用户目录作为插件目录。
  ClearErrors
  GetTempFileName $1 "$0"
  ${if} ${Errors}
    Goto eIslandUninstallTempReady
  ${endIf}
  Delete "$1"
  ReadEnvStr $eIslandSavedTemp TEMP
  ReadEnvStr $eIslandSavedTmp TMP
  StrCpy $eIslandUninstallTempChanged 1
  System::Call 'kernel32::SetEnvironmentVariableW(w "TEMP", w r0) i.r1'
  System::Call 'kernel32::SetEnvironmentVariableW(w "TMP", w r0) i.r2'
  ${if} $1 == 0
  ${orIf} $2 == 0
    Call eIslandRestoreUninstallTemp
  ${endIf}

  eIslandUninstallTempReady:
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

Function eIslandRestoreUninstallTemp
  ${if} $eIslandUninstallTempChanged == 1
    # 空值代表原环境未定义该变量；Win32 要用 NULL 删除，而不是设为空串。
    ${if} $eIslandSavedTemp == ""
      System::Call 'kernel32::SetEnvironmentVariableW(w "TEMP", p 0)'
    ${else}
      System::Call 'kernel32::SetEnvironmentVariableW(w "TEMP", w "$eIslandSavedTemp")'
    ${endIf}
    ${if} $eIslandSavedTmp == ""
      System::Call 'kernel32::SetEnvironmentVariableW(w "TMP", p 0)'
    ${else}
      System::Call 'kernel32::SetEnvironmentVariableW(w "TMP", w "$eIslandSavedTmp")'
    ${endIf}
    StrCpy $eIslandUninstallTempChanged 0
  ${endIf}
FunctionEnd

!macroundef uninstallOldVersion
!macro uninstallOldVersion ROOT_KEY
  Call eIslandPrepareUninstallTemp
  Push "${ROOT_KEY}"
  Call uninstallOldVersion
  # 环境恢复不能覆盖上游返回的失败标志，尤其是无法启动旧卸载器的情况。
  ${if} ${Errors}
    Call eIslandRestoreUninstallTemp
    SetErrors
  ${else}
    Call eIslandRestoreUninstallTemp
    ClearErrors
  ${endIf}
!macroend
!endif
