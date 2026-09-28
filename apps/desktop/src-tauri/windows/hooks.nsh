; Program Files altinda data klasorunu olusturur.
; Grup adlari (Users / Kullanicilar) yerine SID kullanilir; Windows dili onemsizdir.
!macro NSIS_HOOK_POSTINSTALL
  CreateDirectory "$INSTDIR\data"
  nsExec::ExecToLog '"$SYSDIR\icacls.exe" "$INSTDIR\data" /grant *S-1-5-32-545:(OI)(CI)M'
  Pop $0
  ${If} $0 != 0
    DetailPrint "data folder ACL failed: $0"
    ${IfNot} ${Silent}
      ${If} $PassiveMode <> 1
        MessageBox MB_ICONSTOP "Veri klasoru yazilabilir yapilamadi. Kurulum durdu."
      ${EndIf}
    ${EndIf}
    Abort
  ${EndIf}

  IfFileExists "$INSTDIR\data\okullar.json" gita_data_acl
    IfFileExists "$INSTDIR\seed\okullar.json" 0 gita_data_missing
      CopyFiles /SILENT "$INSTDIR\seed\okullar.json" "$INSTDIR\data\okullar.json"
  gita_data_acl:
  IfFileExists "$INSTDIR\data\okullar.json" 0 gita_data_missing
    nsExec::ExecToLog '"$SYSDIR\icacls.exe" "$INSTDIR\data\okullar.json" /grant *S-1-5-32-545:M'
    Pop $0
    ${If} $0 != 0
      DetailPrint "okullar.json ACL failed: $0"
      ${IfNot} ${Silent}
        ${If} $PassiveMode <> 1
          MessageBox MB_ICONSTOP "Veri dosyasi yazilabilir yapilamadi. Kurulum durdu."
        ${EndIf}
      ${EndIf}
      Abort
    ${EndIf}
    Goto gita_data_done
  gita_data_missing:
    DetailPrint "Seed JSON was not copied. The app creates it on first launch."
  gita_data_done:
!macroend
