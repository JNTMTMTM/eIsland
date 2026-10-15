# Keep electron-builder's extraction and registry logic intact. Wrapping its
# macro in a function lets the installer recheck after the old uninstaller has
# finished, at the actual file replacement boundary.
!cd "${PROJECT_DIR}\node_modules\app-builder-lib\templates\nsis"
!ifndef EISLAND_INSTALL_FILES_INCLUDED
!define EISLAND_INSTALL_FILES_INCLUDED
!include "${PROJECT_DIR}\node_modules\app-builder-lib\templates\nsis\include\installer.nsh"

Function eIslandInstallApplicationFiles
  !insertmacro installApplicationFiles
FunctionEnd

!macroundef installApplicationFiles
!macro installApplicationFiles
  Call eIslandFinalProcessCheck
  Call eIslandInstallApplicationFiles
!macroend
!endif
