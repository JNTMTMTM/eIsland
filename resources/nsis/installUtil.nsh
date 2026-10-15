# The extraction function needs these upstream helpers before the install
# section. Guard the later template include so each helper is defined once.
!ifndef EISLAND_INSTALL_UTIL_INCLUDED
!define EISLAND_INSTALL_UTIL_INCLUDED
!include "${PROJECT_DIR}\node_modules\app-builder-lib\templates\nsis\include\installUtil.nsh"
!endif
