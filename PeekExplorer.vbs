' Peek Explorer launcher: double-click to start with no console window.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
exe = dir & "\node_modules\electron\dist\electron.exe"
If Not fso.FileExists(exe) Then
  MsgBox "Electron is not installed yet." & vbCrLf & "Run  npm install  once in:" & vbCrLf & dir, 48, "Peek Explorer"
  WScript.Quit 1
End If
sh.CurrentDirectory = dir
sh.Run """" & exe & """ """ & dir & """", 1, False
