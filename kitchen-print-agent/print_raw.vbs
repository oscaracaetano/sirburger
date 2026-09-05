Set objArgs = WScript.Arguments
If objArgs.Count < 2 Then
    WScript.Quit 1
End If

printerName = objArgs(0)
filePath = objArgs(1)

Set fso = CreateObject("Scripting.FileSystemObject")
If Not fso.FileExists(filePath) Then
    WScript.Quit 1
End If

Set shell = CreateObject("WScript.Shell")
command = "cmd /c copy /b """ & filePath & """ ""\\localhost\" & printerName & """"
shell.Run command, 0, True
