$files = Get-ChildItem -Path 'c:\Users\Laptop\Documents\Projects\openmix-v1\frontend\src' -Recurse -Include '*.svelte'
foreach ($f in $files) {
  $c = Get-Content $f.FullName -Raw
  $changed = $false
  
  # Cyan to amber
  if ($c -match '#22d3ee') {
    $c = $c -replace '#22d3ee', '#fbbf24'
    $c = $c -replace 'rgba\(34, 211, 238', 'rgba(251, 191, 36'
    $c = $c -replace 'rgba\(34,211,238', 'rgba(251,191,36'
    $changed = $true
  }
  
  # Background warmification (slate -> gunmetal)
  if ($c -match '#0b0d12|#020617|#0f172a|#111827|#1e293b|#334155|#1f2937') {
    $c = $c -replace '#0b0d12', '#0a0a0a'
    $c = $c -replace '#020617', '#0a0a0a'
    $c = $c -replace '#080a0f', '#0c0c0c'
    $c = $c -replace '#0f172a', '#121212'
    $c = $c -replace '#0f1115', '#111111'
    $c = $c -replace '#111827', '#151515'
    $c = $c -replace '#12151c', '#141414'
    $c = $c -replace '#0a1220', '#0e0e0e'
    $c = $c -replace '#1e293b', '#252525'
    $c = $c -replace '#1f2937', '#222222'
    $c = $c -replace '#334155', '#333333'
    $c = $c -replace '#27435a', '#3a3a3a'
    $changed = $true
  }

  # Border warmification
  if ($c -match '#27272a|#3f3f46|#52525b|#71717a') {
    $c = $c -replace '#27272a', '#252525'
    $c = $c -replace '#3f3f46', '#333333'
    $c = $c -replace '#52525b', '#555555'
    $c = $c -replace '#71717a', '#666666'
    $changed = $true
  }
  
  # Text warmification  
  if ($c -match '#a1a1aa|#94a3b8|#64748b|#475569') {
    $c = $c -replace '#a1a1aa', '#a3a3a3'
    $c = $c -replace '#94a3b8', '#999999'
    $c = $c -replace '#64748b', '#777777'
    $c = $c -replace '#475569', '#666666'
    $changed = $true
  }
  
  # Slate text colors
  if ($c -match '#cbd5e1|#e2e8f0|#f8fafc|#f9fafb') {
    $c = $c -replace '#cbd5e1', '#d4d4d4'
    $c = $c -replace '#e2e8f0', '#e5e5e5'
    $c = $c -replace '#f8fafc', '#fafafa'
    $c = $c -replace '#f9fafb', '#fafafa'
    $changed = $true
  }

  if ($changed) {
    Set-Content $f.FullName $c -NoNewline
    Write-Output "Updated: $($f.Name)"
  }
}
