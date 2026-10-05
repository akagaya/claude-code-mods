# Sets the title of the console Claude Code runs in. A child of Claude Code gets a
# hidden console of its own, so this attaches to the ancestor's before setting it.
$title = $env:CLAUDE_TITLE_BAR
if (-not $title) { exit 0 }

Add-Type -Namespace TitleBar -Name Console -MemberDefinition @'
[DllImport("kernel32.dll")] public static extern bool FreeConsole();
[DllImport("kernel32.dll")] public static extern bool AttachConsole(uint pid);
[DllImport("kernel32.dll", CharSet = CharSet.Unicode)] public static extern bool SetConsoleTitleW(string title);
'@

$id = $PID
for ($i = 0; $i -lt 8; $i++) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$id"
  if (-not $process) { exit 1 }

  $id = $process.ParentProcessId
  $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$id"
  if ($parent -and $parent.Name -in 'claude.exe', 'node.exe') {
    [void][TitleBar.Console]::FreeConsole()
    if ([TitleBar.Console]::AttachConsole([uint32]$id)) {
      [void][TitleBar.Console]::SetConsoleTitleW($title)
      exit 0
    }
    exit 1
  }
}
exit 1
