# LiveLabs Markdown Auto-Fixer (PowerShell Version)
# Automatically fixes issues that can be safely resolved without human judgment.
# Run this before submitting a PR to fix common validation errors.
#
# Usage:
#   .\fix-livelabs-markdown.ps1 /path/to/workshop   # Fix all .md files in directory
#   .\fix-livelabs-markdown.ps1 file1.md file2.md   # Fix specific files
#   .\fix-livelabs-markdown.ps1                     # Fix all .md files in current directory

param(
    [Parameter(Position=0, ValueFromRemainingArguments=$true)]
    [string[]]$Paths
)

$script:FIXED = 0
$script:SKIPPED = 0

function Log-Fixed {
    param([string]$Message)
    Write-Host "  " -NoNewline
    Write-Host "FIXED" -ForegroundColor Green -NoNewline
    Write-Host ": $Message"
    $script:FIXED++
}

function Log-Manual {
    param([string]$Message)
    Write-Host "  " -NoNewline
    Write-Host "MANUAL" -ForegroundColor Yellow -NoNewline
    Write-Host ": $Message"
    $script:SKIPPED++
}

# Get markdown files from args, directory, or find all in current directory
$Files = @()

if ($Paths -and $Paths.Count -gt 0) {
    if (Test-Path $Paths[0] -PathType Container) {
        $TargetDir = $Paths[0]
        Write-Host "Scanning directory: $TargetDir"
        Write-Host ""
        $Files = Get-ChildItem -Path $TargetDir -Filter "*.md" -Recurse -File |
            Where-Object { $_.FullName -notmatch 'node_modules|\.github' } |
            Sort-Object FullName |
            Select-Object -ExpandProperty FullName
    } else {
        $Files = $Paths | Where-Object { Test-Path $_ -PathType Leaf }
    }
} else {
    $Files = Get-ChildItem -Path "." -Filter "*.md" -Recurse -File |
        Where-Object { $_.FullName -notmatch 'node_modules|\.github' } |
        Sort-Object FullName |
        Select-Object -ExpandProperty FullName
}

if ($Files.Count -eq 0) {
    Write-Host "No markdown files found."
    exit 0
}

Write-Host "================================================"
Write-Host "LiveLabs Markdown Auto-Fixer"
Write-Host "================================================"
Write-Host ""

foreach ($file in $Files) {
    if (-not (Test-Path $file -PathType Leaf)) {
        continue
    }

    Write-Host "Processing: $file"
    $FileFixes = 0

    # Read file content
    $lines = Get-Content -Path $file -Encoding UTF8 -ErrorAction SilentlyContinue
    if (-not $lines) { $lines = @() }

    # ----------------------------------------------------------------
    # Fix 9b: Replace tab characters after numbered list items with a space
    # "1.\t" -> "1. "
    # ----------------------------------------------------------------
    $newLines = @()
    $changed = $false
    foreach ($line in $lines) {
        if ($line -match '^\s*\d+\.\t') {
            $newLine = $line -replace '^(\s*\d+\.)\t', '$1 '
            $newLines += $newLine
            $changed = $true
        } else {
            $newLines += $line
        }
    }
    if ($changed) {
        Set-Content -Path $file -Value $newLines -Encoding UTF8
        $lines = $newLines
        Log-Fixed "Replaced tab characters with spaces in numbered list items"
        $FileFixes++
    }

    # ----------------------------------------------------------------
    # Fix 9c: Replace multiple spaces after numbered list items with a single space
    # "1.  text" -> "1. text"
    # ----------------------------------------------------------------
    $newLines = @()
    $changed = $false
    foreach ($line in $lines) {
        if ($line -match '^\s*\d+\.  ') {
            $newLine = $line -replace '^(\s*\d+\.) {2,}', '$1 '
            $newLines += $newLine
            $changed = $true
        } else {
            $newLines += $line
        }
    }
    if ($changed) {
        Set-Content -Path $file -Value $newLines -Encoding UTF8
        $lines = $newLines
        Log-Fixed "Replaced multiple spaces with single space in numbered list items"
        $FileFixes++
    }

    # ----------------------------------------------------------------
    # Fix 5b: Convert HTML anchor tags to Markdown links
    # <a href="URL">text</a>  ->  [text](URL)
    # ----------------------------------------------------------------
    $content = Get-Content -Path $file -Raw -Encoding UTF8
    if ($content -match '<a\s+href=') {
        $content = [regex]::Replace($content, '<a\s+href=[''"]([^''"]+)[''""]\s*>([^<]*)</a>', '[$2]($1)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
        $lines = Get-Content -Path $file -Encoding UTF8
        Log-Fixed "Converted HTML anchor tags to Markdown links"
        $FileFixes++
    }

    # ----------------------------------------------------------------
    # Fix 5: Add placeholder alt text to empty image references
    # ![]( -> ![image](
    # Excludes YouTube embeds: ![](youtube:...)
    # ----------------------------------------------------------------
    $content = Get-Content -Path $file -Raw -Encoding UTF8
    if ($content -match '!\[\]\((?!youtube:)') {
        $content = [regex]::Replace($content, '!\[\]\((?!youtube:)', '![image](')
        Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
        $lines = Get-Content -Path $file -Encoding UTF8
        Log-Fixed "Added placeholder alt text 'image' to empty image references (review and replace with descriptive text)"
        $FileFixes++
    }

    # ----------------------------------------------------------------
    # Fix 14: Lowercase image file paths in markdown references
    # ![alt](images/MyFile.PNG)  ->  ![alt](images/myfile.png)
    # ----------------------------------------------------------------
    $content = Get-Content -Path $file -Raw -Encoding UTF8
    if ($content -match 'images/[^)"]+[A-Z][^)"]*') {
        $content = [regex]::Replace($content, '(!\[[^\]]*\]\()([^)]+)(\))', {
            param($m)
            $pre  = $m.Groups[1].Value
            $path = $m.Groups[2].Value
            $post = $m.Groups[3].Value
            $path = [regex]::Replace($path, 'images/[^\s")]+', { param($pm) $pm.Value.ToLower() })
            "$pre$path$post"
        })
        Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
        $lines = Get-Content -Path $file -Encoding UTF8
        Log-Fixed "Lowercased image file paths in references"
        $FileFixes++
    }

    # ----------------------------------------------------------------
    # Fix 3: Add Acknowledgements section if missing
    # ----------------------------------------------------------------
    $content = Get-Content -Path $file -Raw -Encoding UTF8
    if ($content -notmatch '(?m)^## Acknowledgements') {
        Add-Content -Path $file -Value "" -Encoding UTF8
        Add-Content -Path $file -Value "## Acknowledgements" -Encoding UTF8
        Add-Content -Path $file -Value "" -Encoding UTF8
        Add-Content -Path $file -Value "* **Author** - TODO: Your Name, Your Title, Your Organization" -Encoding UTF8
        Add-Content -Path $file -Value "* **Last Updated By/Date** - TODO: Your Name, Month Year" -Encoding UTF8
        $lines = Get-Content -Path $file -Encoding UTF8
        Log-Fixed "Added '## Acknowledgements' section at end of file (update with your details)"
        $FileFixes++
    }

    # ----------------------------------------------------------------
    # Fix 12/13: Add Estimated Time if missing
    # For introduction.md: add "Estimated Workshop Time: x minutes"
    # For others: add "Estimated Time: x minutes" after Introduction header
    # ----------------------------------------------------------------
    $content = Get-Content -Path $file -Raw -Encoding UTF8
    $baseName = Split-Path -Leaf $file

    if ($baseName -eq "introduction.md") {
        if ($content -notmatch 'Estimated Workshop Time.*:') {
            if ($content -match '(?m)^## Introduction') {
                $content = $content -replace '(?m)(^## Introduction\r?\n)', "`$1`nEstimated Workshop Time: TODO - x minutes`n"
            } else {
                # Insert after first line
                $linesArr = $content -split "`n"
                $linesArr = @($linesArr[0], "Estimated Workshop Time: TODO - x minutes", "") + $linesArr[1..($linesArr.Length-1)]
                $content = $linesArr -join "`n"
            }
            Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
            $lines = Get-Content -Path $file -Encoding UTF8
            Log-Fixed "Added 'Estimated Workshop Time:' placeholder (update with actual time)"
            $FileFixes++
        }
    } else {
        if ($content -notmatch '(?i)Estimated.*Time.*:') {
            if ($content -match '(?m)^## Introduction') {
                $content = $content -replace '(?m)(^## Introduction\r?\n)', "`$1`nEstimated Time: TODO - x minutes`n"
            } else {
                $content = $content -replace '(?m)(^# [^\n]+\r?\n)', "`$1`nEstimated Time: TODO - x minutes`n"
            }
            Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
            $lines = Get-Content -Path $file -Encoding UTF8
            Log-Fixed "Added 'Estimated Time:' placeholder (update with actual time)"
            $FileFixes++
        }
    }

    # ----------------------------------------------------------------
    # Fix 11: Add Objectives section if missing
    # Inserted inside Introduction section if present, else after H1
    # ----------------------------------------------------------------
    $content = Get-Content -Path $file -Raw -Encoding UTF8
    if ($content -notmatch '(?m)^###? Objectives') {
        if ($content -match '(?m)^## Introduction') {
            # Insert Objectives before next ## section after Introduction
            $content = [regex]::Replace($content,
                '(?ms)(^## Introduction\n(?:.*?\n)*?)(^## )',
                "`$1### Objectives`n`nIn this lab, you will:`n* TODO: Add objectives`n`n`$2")
        } else {
            $content = [regex]::Replace($content,
                '(?m)(^# [^\n]+\n)',
                "`$1`n### Objectives`n`nIn this lab, you will:`n* TODO: Add objectives`n")
        }
        Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
        $lines = Get-Content -Path $file -Encoding UTF8
        Log-Fixed "Added '### Objectives' section (update with actual objectives)"
        $FileFixes++
    }

    # ----------------------------------------------------------------
    # Fix 10: Add Introduction section if missing (only for files with Tasks)
    # ----------------------------------------------------------------
    $content = Get-Content -Path $file -Raw -Encoding UTF8
    if ($content -match '(?m)^## Task' -and $content -notmatch '(?m)^## Introduction') {
        $content = [regex]::Replace($content,
            '(?m)(^## Task )',
            "`n## Introduction`n`nTODO: Add introduction text here.`n`n`$1",
            [System.Text.RegularExpressions.RegexOptions]::Multiline,
            [System.TimeSpan]::FromSeconds(5))
        # Only replace first occurrence
        $content = $content -replace '(?s)(\n## Introduction\n\nTODO: Add introduction text here\.\n\n)(.*?)(\n## Introduction\n\nTODO: Add introduction text here\.\n\n)', '$1$2$3'
        Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
        $lines = Get-Content -Path $file -Encoding UTF8
        Log-Fixed "Added '## Introduction' section before first Task (update with actual content)"
        $FileFixes++
    }

    # ----------------------------------------------------------------
    # Fix 16-18: Fix indentation inside numbered steps
    # ----------------------------------------------------------------
    $lines = Get-Content -Path $file -Encoding UTF8
    $headingIndices = @()
    $taskIndices = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^## ') {
            $headingIndices += $i
            if ($lines[$i] -match '^## Task') {
                $taskIndices += $i
            }
        }
    }

    $indentFixes = 0
    $linesArray = [System.Collections.Generic.List[string]]::new()
    $linesArray.AddRange($lines)

    foreach ($start in $taskIndices) {
        $sectionStart = $start + 1
        $nextHeadings = $headingIndices | Where-Object { $_ -gt $start }
        $sectionEnd = if ($nextHeadings) { ($nextHeadings | Select-Object -First 1) } else { $linesArray.Count }

        if ($sectionStart -ge $sectionEnd) { continue }

        $section = $linesArray[$sectionStart..($sectionEnd - 1)]

        $hasOrderedList = $false
        foreach ($sl in $section) {
            if ($sl -match '^\d+\. ') { $hasOrderedList = $true; break }
        }
        if (-not $hasOrderedList) { continue }

        $firstStepOffset = -1
        for ($offset = 0; $offset -lt $section.Count; $offset++) {
            if ($section[$offset] -match '^\d+\. ') { $firstStepOffset = $offset; break }
        }
        if ($firstStepOffset -lt 0) { continue }

        $inCodeBlock = $false
        for ($offset = $firstStepOffset; $offset -lt $section.Count; $offset++) {
            $ln = $section[$offset]
            $stripped = $ln.TrimStart(' ')
            $indent = $ln.Length - $stripped.Length
            $absIdx = $sectionStart + $offset

            if ($stripped -like '```*') {
                if (-not $inCodeBlock) {
                    $inCodeBlock = $true
                    if ($indent -lt 4) {
                        $linesArray[$absIdx] = '    ' + $stripped
                        $indentFixes++
                    }
                } else {
                    $inCodeBlock = $false
                    if ($indent -lt 4 -and $stripped.TrimEnd() -eq '```') {
                        $linesArray[$absIdx] = '    ' + $stripped
                        $indentFixes++
                    }
                }
                continue
            }

            if ($inCodeBlock) {
                if ($indent -lt 4 -and $stripped -ne '') {
                    $linesArray[$absIdx] = '    ' + $stripped
                    $indentFixes++
                }
                continue
            }

            if ([string]::IsNullOrWhiteSpace($stripped)) { continue }
            if ($ln -match '^\d+\. ') { continue }

            if ($indent -lt 4) {
                $linesArray[$absIdx] = '    ' + $stripped
                $indentFixes++
            }
        }
    }

    if ($indentFixes -gt 0) {
        Set-Content -Path $file -Value $linesArray -Encoding UTF8
        Log-Fixed "Fixed indentation ($indentFixes lines) inside numbered steps"
        $FileFixes++
    }

    # ----------------------------------------------------------------
    # Report issues that need manual fixing
    # ----------------------------------------------------------------
    $lines = Get-Content -Path $file -Encoding UTF8
    $content = Get-Content -Path $file -Raw -Encoding UTF8

    $firstContent = ($lines | Where-Object { $_ -match '\S' } | Select-Object -First 1)
    if (-not $firstContent -or $firstContent -notmatch '^#[^#]') {
        Log-Manual "Missing H1 title - add '# Your Lab Title' as the first line"
    }

    $inCodeBlock = $false
    $h1Count = 0
    foreach ($line in $lines) {
        if ($line -match '^\s*```\s*$' -or $line -match '^\s*```[a-zA-Z]+\s*$') {
            $inCodeBlock = -not $inCodeBlock
            continue
        }
        if (-not $inCodeBlock -and $line -match '^# ') { $h1Count++ }
    }
    if ($h1Count -gt 1) {
        Log-Manual "Multiple H1 headers ($h1Count found) - manually remove extra H1s"
    }

    $openCopy = ([regex]::Matches($content, '<copy>')).Count
    $closeCopy = ([regex]::Matches($content, '</copy>')).Count
    if ($openCopy -ne $closeCopy) {
        Log-Manual "Mismatched <copy> tags (open: $openCopy, close: $closeCopy) - manually fix"
    }

    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        if ($line -match '^## Task') {
            if ($line -notmatch '^## Task \d+:') {
                Log-Manual "Task header at line $lineNum doesn't follow '## Task N: Description' format - manually fix"
            }
        }
    }

    if ($FileFixes -eq 0) {
        Write-Host "  No auto-fixes needed"
    }
    Write-Host ""
}

Write-Host "================================================"
Write-Host "Summary"
Write-Host "================================================"
Write-Host "Auto-fixes applied : $script:FIXED"
Write-Host "Manual fixes needed: $script:SKIPPED"
Write-Host ""

if ($script:SKIPPED -gt 0) {
    Write-Host "Some issues require manual attention. Run the validator to see remaining errors." -ForegroundColor Yellow
} else {
    Write-Host "All fixable issues resolved. Run the validator to confirm." -ForegroundColor Green
}
