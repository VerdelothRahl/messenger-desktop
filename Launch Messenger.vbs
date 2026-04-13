Dim objShell, objWMI, objProcesses, objProcess
Set objShell = CreateObject("WScript.Shell")
Set objWMI = GetObject("winmgmts:\\.\root\cimv2")

' Kill any running instances of the app
Set objProcesses = objWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name = 'electron.exe'")
For Each objProcess In objProcesses
  objProcess.Terminate()
Next

' Short pause to let processes fully exit
WScript.Sleep 500

' Launch the app
Dim appDir
appDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
objShell.Run """" & appDir & "\node_modules\electron\dist\electron.exe"" """ & appDir & """", 0, False
