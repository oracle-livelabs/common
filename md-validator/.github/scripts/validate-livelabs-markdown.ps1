# LiveLabs Markdown Formatting Validator (PowerShell Version)
# Validates markdown files against LiveLabs formatting standards

param(
    [Parameter(Position=0, ValueFromRemainingArguments=$true)]
    [string[]]$Paths
)

$script:ERRORS = 0

function Log-Error {
    param([string]$Message)
    Write-Host "ERROR" -ForegroundColor Red -NoNewline
    Write-Host ": $Message"
    $script:ERRORS++
}

function Log-Success {
    param([string]$Message)
    Write-Host "PASS" -ForegroundColor Green -NoNewline
    Write-Host ": $Message"
}

# Get markdown files from args, directory, or find all in current directory
$Files = @()

if ($Paths -and $Paths.Count -gt 0) {
    # Check if first argument is a directory
    if (Test-Path $Paths[0] -PathType Container) {
        $TargetDir = $Paths[0]
        Write-Host "Scanning directory: $TargetDir"
        Write-Host ""
        $Files = Get-ChildItem -Path $TargetDir -Filter "*.md" -Recurse -File |
            Where-Object { $_.FullName -notmatch 'node_modules|\.github' } |
            Sort-Object FullName |
            Select-Object -ExpandProperty FullName
    } else {
        # Treat arguments as individual files
        $Files = $Paths | Where-Object { Test-Path $_ -PathType Leaf }
    }
} else {
    $Files = Get-ChildItem -Path "." -Filter "*.md" -Recurse -File |
        Where-Object { $_.FullName -notmatch 'node_modules|\.github' } |
        Sort-Object FullName |
        Select-Object -ExpandProperty FullName
}

# Check if any files were found
if ($Files.Count -eq 0) {
    Write-Host "No markdown files found."
    exit 0
}

Write-Host "================================================"
Write-Host "LiveLabs Markdown Formatting Validator"
Write-Host "================================================"
Write-Host ""

foreach ($file in $Files) {
    if (-not (Test-Path $file -PathType Leaf)) {
        continue
    }

    Write-Host "Checking: $file"
    $FileErrors = 0

    $content = Get-Content -Path $file -Raw -ErrorAction SilentlyContinue
    if (-not $content) {
        $content = ""
    }
    $lines = Get-Content -Path $file -ErrorAction SilentlyContinue
    if (-not $lines) {
        $lines = @()
    }

    # Rule 1: Check for H1 title (must be first non-empty line)
    $firstContent = ($lines | Where-Object { $_ -match '\S' } | Select-Object -First 1)
    if ($firstContent -and -not ($firstContent -match '^#[^#]')) {
        Log-Error "$file`: First line must be an H1 title (# Title)"
        $FileErrors++
    }

    # Rule 2: Check for only one H1 per file (excluding code blocks)
    $inCodeBlock = $false
    $h1Count = 0
    foreach ($line in $lines) {
        # Check for fenced code block markers (``` alone or ```language)
        if ($line -match '^\s*```\s*$' -or $line -match '^\s*```[a-zA-Z]+\s*$') {
            $inCodeBlock = -not $inCodeBlock
            continue
        }
        if (-not $inCodeBlock -and $line -match '^# ') {
            $h1Count++
        }
    }
    if ($h1Count -gt 1) {
        Log-Error "$file`: Multiple H1 headers found ($h1Count). Only one H1 allowed per file."
        $FileErrors++
    }

    # Rule 3: Check for Acknowledgements section
    if ($content -notmatch '(?m)^## Acknowledgements') {
        Log-Error "$file`: Missing '## Acknowledgements' section"
        $FileErrors++
    }

    # Rule 4: (Removed - no longer checking for Author format in Acknowledgements)

    # Rule 5: Check image references have alt text
    # Pattern: ![](images/...) is invalid, should be ![alt text](images/...)
    $lineNum = 0
    $emptyAltLines = @()
    foreach ($line in $lines) {
        $lineNum++
        if ($line -match '!\[\]\s*\(' -and $line -notmatch '!\[\]\(youtube:') {
            $emptyAltLines += $lineNum
        }
    }
    if ($emptyAltLines.Count -gt 0) {
        $linesList = $emptyAltLines -join ', '
        Log-Error "$file (line $linesList): Image references must have alt text: ![alt text](images/file.png)"
        $FileErrors++
    }

    # Rule 5b: Disallow inline HTML anchor tags
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        if ($line -match '<a\s+href=') {
            Log-Error "$file (line $lineNum): HTML anchor tags (<a href=...>) are not allowed; use Markdown links instead."
            $FileErrors++
        }
    }

    # Rule 6: Check YouTube format is correct
    if ($content -match '\[.+\]\(youtube:' -and $content -notmatch '^\[\]\(youtube:') {
        Log-Error "$file`: YouTube embeds should use format: [](youtube:VIDEO_ID)"
        $FileErrors++
    }

    # Rule 7: Check for proper Task format (## Task N: Description)
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        if ($line -match '^## Task') {
            if ($line -notmatch '^## Task \d+:') {
                Log-Error "$file (line $lineNum): Task headers should follow format '## Task N: Description'"
                $FileErrors++
            }
        }
    }

    # Rule 8: Check <copy> tags are properly closed
    $openCopy = ([regex]::Matches($content, '<copy>')).Count
    $closeCopy = ([regex]::Matches($content, '</copy>')).Count
    if ($openCopy -ne $closeCopy) {
        Log-Error "$file`: Mismatched <copy> tags (open: $openCopy, close: $closeCopy)"
        $FileErrors++
    }

    # Rule 9: Check Note format (skipped - blockquotes used for other purposes)

    # Rule 10: Check for Introduction or About section in labs
    if ($content -match '(?m)^## Task') {
        if ($content -notmatch '(?m)^## Introduction') {
            Log-Error "$file`: Labs with Tasks should have an '## Introduction' section"
            $FileErrors++
        }
    }

    # Rule 11: Check for Objectives section
    if ($content -notmatch '(?m)^###? Objectives') {
        Log-Error "$file`: Missing '### Objectives' section"
        $FileErrors++
    }

    # Rule 12 & 13: Check for Estimated Time
    $basenamefile = Split-Path -Leaf $file
    if ($basenamefile -eq "introduction.md") {
        # Rule 13: introduction.md must have "Estimated Workshop Time:"
        if ($content -notmatch 'Estimated Workshop Time:') {
            Log-Error "$file`: introduction.md must contain 'Estimated Workshop Time:'"
            $FileErrors++
        }
    } else {
        # Rule 12: Other files must have "Estimated Time:"
        if ($content -notmatch '(?i)Estimated.*Time:') {
            Log-Error "$file`: Missing 'Estimated Time:' information"
            $FileErrors++
        }
    }

    # Rule 14: Check filenames in image references are lowercase
    $imageRefs = [regex]::Matches($content, '!\[.*?\]\((images/[^)]+)\)')
    foreach ($match in $imageRefs) {
        $img = $match.Groups[1].Value
        $lowercaseImg = $img.ToLower()
        if ($img -cne $lowercaseImg) {
            Log-Error "$file`: Image filename should be lowercase: $img"
            $FileErrors++
        }
    }

    # Rule 15+: Task indentation / numbering rules
    $taskIndices = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^## Task') {
            $taskIndices += $i
        }
    }

    if ($taskIndices.Count -gt 0) {
        for ($idx = 0; $idx -lt $taskIndices.Count; $idx++) {
            $sectionStart = $taskIndices[$idx] + 1
            $sectionEnd = ($idx + 1 -lt $taskIndices.Count) ? $taskIndices[$idx + 1] : $lines.Count

            if ($sectionStart -ge $sectionEnd) {
                continue
            }

            $section = $lines[$sectionStart..($sectionEnd - 1)]
            if (-not ($section | Where-Object { $_ -match '^\s*\d+\.' })) {
                $headingLine = $taskIndices[$idx] + 1
                Log-Error "$file`: line $headingLine: Task sections should contain numbered steps following the heading."
                $FileErrors++
            }

            for ($offset = 0; $offset -lt $section.Length; $offset++) {
                $currentLine = $section[$offset]
                $trimmed = $currentLine.TrimStart(' ', "`t")
                $indent = $currentLine.Length - $trimmed.Length
                $lineNumber = $sectionStart + $offset + 1

                if ($trimmed -like '```*' -and $indent -lt 4) {
                    Log-Error "$file`: line $lineNumber: Code blocks inside Task sections must be indented within the numbered step."
                    $FileErrors++
                }
                if ($trimmed -like '![*' -and $indent -lt 4) {
                    Log-Error "$file`: line $lineNumber: Images inside Task sections must be indented to align with the numbered step."
                    $FileErrors++
                }
            }
        }
    }

    if ($FileErrors -eq 0) {
        Log-Success "$file passed all required checks"
    }
    Write-Host ""
}

Write-Host "================================================"
Write-Host "Summary"
Write-Host "================================================"
Write-Host "Errors: $script:ERRORS"
Write-Host ""

if ($script:ERRORS -gt 0) {
    Write-Host "Validation FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "Validation PASSED" -ForegroundColor Green
    exit 0
}
