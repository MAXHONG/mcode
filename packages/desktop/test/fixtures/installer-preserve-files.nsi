Unicode true
Name "Mcode preserve-files smoke"
OutFile "${OUTPUT_FILE}"
InstallDir "$TEMP\mcode-preserve-files-smoke"
RequestExecutionLevel user
SilentInstall silent

!addincludedir "${NSIS_INCLUDE_DIR}"
!addincludedir "${ELECTRON_BUILDER_NSIS_INCLUDE_DIR}"
!addplugindir /x86-unicode "${NSIS_PLUGIN_DIR}"
!include "LogicLib.nsh"

!define APP_FILENAME "Mcode"
!define APP_EXECUTABLE_FILENAME "Mcode.exe"
!define APP_ID "dev.mcode.preserve-files-smoke"
!define UNINSTALL_REGISTRY_KEY "Software\\Mcode\\InstallerPreserveFilesSmoke"
!define isUpdated `1 == 1`
; This fixture has no electron-builder uninstaller.nsh section; use a normal function for log smoke coverage.
!ifdef BUILD_UNINSTALLER
  !define MCODE_UNINSTALLER_FUNCTION_PREFIX ""
!endif

Var appExe
; 仅恢复场景使用旧安装目录；普通清理夹具在 /WX 下不能留下未引用变量。
!ifndef BUILD_UNINSTALLER
  Var installationDir
!endif

!include "${MCODE_INSTALLER_NSH}"
; 正式构建先加载自定义 include，再由 common.nsh 声明卸载器名称。
!define UNINSTALL_FILENAME "uninstaller.exe"
!ifndef BUILD_UNINSTALLER
  ; customHeader 已包含 McodeDefineCleanupSnapshot 与日志初始化函数；
  ; 单独再展开会导致宏重复定义。
  !insertmacro customHeader

  Function .onInit
    !insertmacro preInit
  FunctionEnd
!endif

Section
  SetOutPath "$INSTDIR"
  File /oname=Mcode.exe "${FIXTURE_EXE}"
  StrCpy $appExe "$INSTDIR\Mcode.exe"
  !ifndef OMIT_MANIFEST
    FileOpen $0 "$INSTDIR\.mcode-install-manifest" w
    FileWrite $0 "Mcode.exe$\r$\n"
    FileWrite $0 "owned-by-mcode.txt$\r$\n"
    !ifdef SELF_MANIFEST
      FileWrite $0 ".mcode-install-manifest$\r$\n"
    !endif
    FileWrite $0 "..\user-data.txt$\r$\n"
    FileClose $0
  !endif
  !ifdef FAIL_DELETE
    ; Keep the file handle open so Windows denies the manifest cleanup delete.
    FileOpen $0 "$INSTDIR\owned-by-mcode.txt" w
    FileWrite $0 "old app payload"
  !else
    FileOpen $0 "$INSTDIR\owned-by-mcode.txt" w
    FileWrite $0 "old app payload"
    FileClose $0
  !endif
  FileOpen $0 "$INSTDIR\user-data.txt" w
  FileWrite $0 "keep me"
  FileClose $0
  !ifdef RECOVERY_TEST
    FileOpen $0 "$INSTDIR\Mcode.exe" w
    FileWrite $0 "old application payload"
    FileClose $0
    InitPluginsDir
    File /oname=$PLUGINSDIR\old-cleanup.exe "${OLD_CLEANUP_EXE}"
    StrCpy $installationDir "$INSTDIR"
    !ifdef BACKUP_FAILURE
      ; 先备份主程序，再用独占句柄阻止下一项复制，验证半份备份不能用于恢复。
      System::Call 'kernel32::CreateFileW(w "$INSTDIR\owned-by-mcode.txt", i 0x80000000, i 0, p 0, i 3, i 0, p 0) p.R8'
    !endif
    !insertmacro customOldUninstallPrepare
    !ifdef BACKUP_FAILURE
      ; 仅让备份失败；旧卸载和新文件写入不再受此故障句柄影响。
      System::Call 'kernel32::CloseHandle(p R8)'
    !endif
    FileOpen $8 "$INSTDIR\backup-dir.txt" w
    FileWrite $8 "$McodeCleanupBackup"
    FileClose $8
    OneMoreAttempt:
    ExecWait '"$PLUGINSDIR\old-cleanup.exe" /S /D=$INSTDIR' $R0
    !ifdef RESTORE_FAILURE
      ; 同名目录阻止恢复主程序，必须保留备份，不能误报恢复成功。
      CreateDirectory "$INSTDIR\Mcode.exe"
    !endif
    !ifdef BACKUP_DELETE_FAILURE
      ; 句柄保持打开，阻止安装器删除备份目录；关闭会让 RMDir 成功，场景失效。
      CreateDirectory "$McodeCleanupBackup\hold"
      FileOpen $7 "$McodeCleanupBackup\hold\locked.txt" w
      FileWrite $7 "keep backup"
    !endif
    ${If} $R0 != 0
      !insertmacro customOldUninstallRetryFailed
    ${EndIf}
    !insertmacro customUnInstallCheck
  !else
    !insertmacro customRemoveFiles
  !endif
  ; 成功清理后模拟新版本文件落盘；失败路径必须在此前返回。
  SetOutPath "$INSTDIR"
  File /oname=Mcode.exe "${FIXTURE_EXE}"
  IfFileExists "$INSTDIR\owned-by-mcode.txt" 0 mcodeOwnedRemoved
    StrCpy $1 "present"
    Goto mcodeWriteMarker
  mcodeOwnedRemoved:
    StrCpy $1 "removed"
  mcodeWriteMarker:
  FileOpen $0 "$INSTDIR\remove-result.txt" w
  FileWrite $0 "$1"
  FileClose $0
SectionEnd
