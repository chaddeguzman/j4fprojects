param(
    [string]$SkillPath
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$InboundDir = Join-Path $ProjectRoot "1 inbound"
$DoneDir = Join-Path $InboundDir "Done"
$OutboundDir = Join-Path $ProjectRoot "2 outbound"
$ReferenceDir = Join-Path $ProjectRoot "3 references"
$TemplateDir = Join-Path $ProjectRoot "4 templates"
$SkillsDir = Join-Path $ProjectRoot "6 skills"
$LogDir = Join-Path $PSScriptRoot "logs"
$SupportedExtensions = @(".txt", ".md", ".markdown", ".csv", ".json", ".xml", ".log")
$MarkdownExtensions = @(".md", ".markdown")
$StopWords = @(
    "a", "an", "and", "are", "as", "be", "below", "by", "codex", "content", "create",
    "document", "file", "final", "for", "from", "generate", "how", "if", "in", "into",
    "is", "it", "local", "markdown", "of", "on", "only", "or", "return", "selected",
    "should", "skill", "source", "text", "that", "the", "this", "to", "use", "with",
    "workflow", "you"
)

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    Add-Content -LiteralPath $script:LogPath -Value $line -Encoding UTF8
    Write-Host $line
}

function Get-SafeOutputPath {
    param(
        [string]$SourceFile
    )

    $stem = [System.IO.Path]::GetFileNameWithoutExtension($SourceFile)
    $invalidPattern = "[{0}]" -f [Regex]::Escape((-join [System.IO.Path]::GetInvalidFileNameChars()))
    $stem = [Regex]::Replace($stem, $invalidPattern, "_")

    if ([string]::IsNullOrWhiteSpace($stem)) {
        $stem = "output"
    }

    $candidate = Join-Path $OutboundDir "$stem.md"
    if (-not (Test-Path -LiteralPath $candidate)) {
        return $candidate
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    return (Join-Path $OutboundDir "$stem-$stamp.md")
}

function Get-ProjectRelativePath {
    param(
        [string]$Path
    )

    $rootPath = (Resolve-Path -LiteralPath $ProjectRoot).ProviderPath.TrimEnd("\")

    try {
        $fullPath = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).ProviderPath
    }
    catch {
        $fullPath = [System.IO.Path]::GetFullPath($Path)
    }

    if ($fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relativePath = $fullPath.Substring($rootPath.Length).TrimStart("\")
        if ($relativePath) {
            return ".\$relativePath"
        }
    }

    return $fullPath
}

function ConvertTo-Keywords {
    param(
        [string]$Text
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return @()
    }

    $expanded = [Regex]::Replace($Text, "([a-z0-9])([A-Z])", '$1 $2')
    $expanded = [Regex]::Replace($expanded, "[^A-Za-z0-9]+", " ").ToLowerInvariant()

    return @(
        $expanded -split "\s+" |
            Where-Object {
                $_.Length -gt 1 -and
                -not ($StopWords -contains $_)
            } |
            Sort-Object -Unique
    )
}

function ConvertTo-Key {
    param(
        [string]$Text
    )

    $keywords = @(ConvertTo-Keywords -Text $Text)
    return ($keywords -join "")
}

function Get-FrontMatter {
    param(
        [string]$Text
    )

    $metadata = @{}
    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $metadata
    }

    $match = [Regex]::Match($Text, "(?s)^---\r?\n(.*?)\r?\n---")
    if (-not $match.Success) {
        return $metadata
    }

    foreach ($line in ($match.Groups[1].Value -split "\r?\n")) {
        $parts = $line -split ":", 2
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim().ToLowerInvariant()
            $value = $parts[1].Trim()
            if ($key) {
                $metadata[$key] = $value
            }
        }
    }

    return $metadata
}

function Get-FirstMarkdownHeading {
    param(
        [string]$Text
    )

    $match = [Regex]::Match($Text, "(?m)^#\s+(.+)$")
    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }

    return ""
}

function Split-MetadataList {
    param(
        [string]$Text
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return @()
    }

    return @(
        $Text -split "," |
            ForEach-Object { $_.Trim() } |
            Where-Object { $_ }
    )
}

function Get-MatchingMarkdownFiles {
    param(
        [string]$Directory,
        [System.IO.FileInfo]$Skill,
        [string]$SkillText
    )

    if (-not (Test-Path -LiteralPath $Directory)) {
        return @()
    }

    $skillHeading = Get-FirstMarkdownHeading -Text $SkillText
    $skillKeywords = @(
        ConvertTo-Keywords -Text $Skill.BaseName
        ConvertTo-Keywords -Text $skillHeading
        ConvertTo-Keywords -Text $SkillText
    ) | Sort-Object -Unique
    $skillKeys = @(
        ConvertTo-Key -Text $Skill.BaseName
        ConvertTo-Key -Text $skillHeading
    ) | Where-Object { $_ }

    $items = @(
        Get-ChildItem -LiteralPath $Directory -Recurse -File |
            Where-Object {
                -not $_.Name.StartsWith(".") -and
                $MarkdownExtensions -contains $_.Extension.ToLowerInvariant()
            } |
            Sort-Object FullName
    )

    $matches = @()
    foreach ($item in $items) {
        $itemText = Get-Content -LiteralPath $item.FullName -Raw -Encoding UTF8
        $metadata = Get-FrontMatter -Text $itemText
        $itemHeading = Get-FirstMarkdownHeading -Text $itemText
        $relativePath = Get-ProjectRelativePath -Path $item.FullName

        $appliesTo = ""
        if ($metadata.ContainsKey("applies_to")) {
            $appliesTo = $metadata["applies_to"]
        }

        $topicText = ""
        if ($metadata.ContainsKey("topics")) {
            $topicText = $metadata["topics"]
        }

        $itemKeywords = @(
            ConvertTo-Keywords -Text $item.BaseName
            ConvertTo-Keywords -Text $relativePath
            ConvertTo-Keywords -Text $itemHeading
            ConvertTo-Keywords -Text $topicText
            ConvertTo-Keywords -Text $appliesTo
        ) | Sort-Object -Unique

        $appliesToKeys = @(
            Split-MetadataList -Text $appliesTo |
                ForEach-Object { ConvertTo-Key -Text $_ }
        )

        $itemKeys = @(
            ConvertTo-Key -Text $item.BaseName
            ConvertTo-Key -Text $itemHeading
            $appliesToKeys
        ) | Where-Object { $_ }

        $explicitMatch = $false
        foreach ($skillKey in $skillKeys) {
            if ($itemKeys -contains $skillKey) {
                $explicitMatch = $true
                break
            }
        }

        $overlap = @($itemKeywords | Where-Object { $skillKeywords -contains $_ })
        if ($explicitMatch -or $overlap.Count -gt 0) {
            $matches += [PSCustomObject]@{
                File = $item
                RelativePath = $relativePath
                Text = $itemText
            }
        }
    }

    return $matches
}

function Format-MarkdownContext {
    param(
        [array]$Items,
        [string]$Label,
        [string]$EmptyMessage
    )

    if ($Items.Count -eq 0) {
        return $EmptyMessage
    }

    $blocks = @()
    foreach ($item in $Items) {
        $blocks += @(
            "$Label file: $($item.RelativePath)"
            '```markdown'
            $item.Text
            '```'
        ) -join [Environment]::NewLine
    }

    return ($blocks -join ([Environment]::NewLine + [Environment]::NewLine))
}

function Select-Skill {
    $skills = @(Get-ChildItem -LiteralPath $SkillsDir -Filter "*.md" -File | Sort-Object Name)
    if ($skills.Count -eq 0) {
        throw "No .md skill files found in '$SkillsDir'. Add a Markdown skill file, then run again."
    }

    Write-Host ""
    Write-Host "Available skills:"
    for ($i = 0; $i -lt $skills.Count; $i++) {
        Write-Host ("  {0}. {1}" -f ($i + 1), $skills[$i].BaseName)
    }

    do {
        $choice = Read-Host "Select a skill number"
        $parsed = 0
        $valid = [int]::TryParse($choice, [ref]$parsed) -and $parsed -ge 1 -and $parsed -le $skills.Count
        if (-not $valid) {
            Write-Host "Enter a number from 1 to $($skills.Count)."
        }
    } until ($valid)

    return $skills[$parsed - 1].FullName
}

function Invoke-CodexTransform {
    param(
        [System.IO.FileInfo]$Source,
        [string]$SelectedSkill,
        [string]$OutputPath
    )

    $skillText = Get-Content -LiteralPath $SelectedSkill -Raw -Encoding UTF8
    $skillItem = Get-Item -LiteralPath $SelectedSkill

    $matchingReferences = @(Get-MatchingMarkdownFiles -Directory $ReferenceDir -Skill $skillItem -SkillText $skillText)
    if ($matchingReferences.Count -eq 0) {
        Write-Log "No matching reference files found for skill: $($skillItem.BaseName)"
    }
    else {
        foreach ($reference in $matchingReferences) {
            Write-Log "Included reference for $($skillItem.BaseName): $($reference.RelativePath)"
        }
    }

    $matchingTemplates = @(Get-MatchingMarkdownFiles -Directory $TemplateDir -Skill $skillItem -SkillText $skillText)
    if ($matchingTemplates.Count -eq 0) {
        Write-Log "No matching template files found for skill: $($skillItem.BaseName)"
    }
    else {
        foreach ($template in $matchingTemplates) {
            Write-Log "Included template for $($skillItem.BaseName): $($template.RelativePath)"
        }
    }

    $referenceContext = Format-MarkdownContext -Items $matchingReferences -Label "Reference" -EmptyMessage "No matching reference files were found."
    $templateContext = Format-MarkdownContext -Items $matchingTemplates -Label "Template" -EmptyMessage "No matching template files were found."
    $sourceText = Get-Content -LiteralPath $Source.FullName -Raw -Encoding UTF8
    $relativeSource = Get-ProjectRelativePath -Path $Source.FullName
    $relativeOutput = Get-ProjectRelativePath -Path $OutputPath

    $prompt = @(
        "You are running a local document workflow."
        ""
        "Apply the selected skill to the source file content below."
        ""
        "Use the reference context for standards, examples, and shared guidance."
        "Use the template context as the target document structure when relevant."
        ""
        "Return only the final Markdown document. Do not wrap it in code fences. Do not describe the process."
        ""
        "Selected skill file:"
        $SelectedSkill
        ""
        "Selected skill instructions:"
        $skillText
        ""
        "Reference context:"
        $referenceContext
        ""
        "Template context:"
        $templateContext
        ""
        "Source file:"
        $relativeSource
        ""
        "Destination file:"
        $relativeOutput
        ""
        "Source content:"
        '```text'
        $sourceText
        '```'
    ) -join [Environment]::NewLine

    $codexArgs = @(
        "exec",
        "--skip-git-repo-check",
        "--ephemeral",
        "--color", "never",
        "-C", $ProjectRoot,
        "-o", $OutputPath,
        "-"
    )

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $codexConsoleOutput = $prompt | & codex @codexArgs 2>&1
        $codexExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($codexExitCode -ne 0 -and $codexConsoleOutput) {
        Add-Content -LiteralPath $script:LogPath -Value "Codex console output:" -Encoding UTF8
        $codexConsoleOutput | Add-Content -LiteralPath $script:LogPath -Encoding UTF8
    }

    return $codexExitCode
}

New-Item -ItemType Directory -Force -Path $DoneDir, $OutboundDir, $LogDir | Out-Null
$script:LogPath = Join-Path $LogDir ("run-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

try {
    if (-not (Test-Path -LiteralPath $InboundDir)) {
        throw "Inbound folder not found: $InboundDir"
    }
    if (-not (Test-Path -LiteralPath $SkillsDir)) {
        throw "Skills folder not found: $SkillsDir"
    }

    if ([string]::IsNullOrWhiteSpace($SkillPath)) {
        $SkillPath = Select-Skill
    }

    $skillItem = Get-Item -LiteralPath $SkillPath
    if ($skillItem.Extension -ne ".md") {
        throw "Skill must be a .md file: $SkillPath"
    }

    $pendingFiles = @(
        Get-ChildItem -LiteralPath $InboundDir -File |
            Where-Object {
                -not $_.Name.StartsWith(".") -and
                $SupportedExtensions -contains $_.Extension.ToLowerInvariant()
            } |
            Sort-Object Name
    )

    Write-Log "Selected skill: $($skillItem.FullName)"
    Write-Log "Inbound folder: $InboundDir"
    Write-Log "Outbound folder: $OutboundDir"

    if ($pendingFiles.Count -eq 0) {
        Write-Log "No pending supported files found."
        exit 0
    }

    $successCount = 0
    $failureCount = 0
    $skippedFiles = @(
        Get-ChildItem -LiteralPath $InboundDir -File |
            Where-Object {
                -not $_.Name.StartsWith(".") -and
                -not ($SupportedExtensions -contains $_.Extension.ToLowerInvariant())
            } |
            Sort-Object Name
    )

    foreach ($skipped in $skippedFiles) {
        Write-Log "Skipping unsupported file type: $($skipped.Name)" "WARN"
    }

    foreach ($file in $pendingFiles) {
        $outputPath = Get-SafeOutputPath -SourceFile $file.Name
        Write-Log "Processing: $($file.Name)"

        try {
            $exitCode = Invoke-CodexTransform -Source $file -SelectedSkill $skillItem.FullName -OutputPath $outputPath
            if ($exitCode -ne 0) {
                throw "Codex exited with code $exitCode"
            }
            if (-not (Test-Path -LiteralPath $outputPath)) {
                throw "Expected output was not created: $outputPath"
            }

            $donePath = Join-Path $DoneDir $file.Name
            if (Test-Path -LiteralPath $donePath) {
                $doneStem = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
                $doneExt = [System.IO.Path]::GetExtension($file.Name)
                $doneStamp = Get-Date -Format "yyyyMMdd-HHmmss"
                $donePath = Join-Path $DoneDir "$doneStem-$doneStamp$doneExt"
            }

            Move-Item -LiteralPath $file.FullName -Destination $donePath
            Write-Log "Success: $($file.Name) -> $([System.IO.Path]::GetFileName($outputPath))"
            $successCount++
        }
        catch {
            Write-Log "Failed: $($file.Name): $($_.Exception.Message)" "ERROR"
            if (Test-Path -LiteralPath $outputPath) {
                Remove-Item -LiteralPath $outputPath -Force
            }
            $failureCount++
        }
    }

    Write-Log "Run complete. Successes: $successCount. Failures: $failureCount."
    if ($failureCount -gt 0) {
        exit 1
    }
    exit 0
}
catch {
    Write-Log $_.Exception.Message "ERROR"
    exit 1
}
