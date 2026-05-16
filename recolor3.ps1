$f = 'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src\App.svelte'
$c = Get-Content $f -Raw

# Blue accent replacements
$c = $c -replace '#3b82f6', '#eab308'
$c = $c -replace '#60a5fa', '#facc15'
$c = $c -replace '#1d4ed8', '#a16207'
$c = $c -replace '#93c5fd', '#fef08a'
$c = $c -replace 'rgba\(59, 130, 246', 'rgba(234, 179, 8'

# Remaining background slate colors
$c = $c -replace '#09090b', '#0a0a0a'
$c = $c -replace '#18181b', '#141414'

Set-Content $f $c -NoNewline
Write-Output "App.svelte updated"
