$files = @(
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\Toast.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\Sidebar.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\SendStrip.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\SendsPanel.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\ScribbleEditor.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\MonitorModal.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\GlobalTabs.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\EqEditor.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\EffectsRack.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\EffectModules\Pitch.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\ChannelModalGraphs\GateGraph.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\ChannelModal.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\ChannelModal\Sections\PreampSection.svelte',
  'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\lib\components\ChannelModal\Sections\OutputSection.svelte'
)
foreach ($f in $files) {
  $c = Get-Content $f -Raw
  $c = $c -replace '#3b82f6', '#eab308'
  $c = $c -replace '#60a5fa', '#facc15'
  $c = $c -replace '#1d4ed8', '#a16207'
  $c = $c -replace '#2563eb', '#ca8a04'
  $c = $c -replace 'rgba\(59, 130, 246', 'rgba(234, 179, 8'
  $c = $c -replace 'rgba\(59,130,246', 'rgba(234,179,8'
  Set-Content $f $c -NoNewline
  Write-Output "Updated: $($f | Split-Path -Leaf)"
}
