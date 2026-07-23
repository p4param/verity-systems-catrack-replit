$workspaceRoot = (Get-Location).Path
$docsRoot = Join-Path $workspaceRoot 'docs'
$outFile = Join-Path $docsRoot 'docs_tree.xml'

if (-not (Test-Path -LiteralPath $docsRoot)) {
  throw "docs folder not found: $docsRoot"
}

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Indent = $true
$settings.IndentChars = '  '
$settings.Encoding = [System.Text.UTF8Encoding]::new($false)

$writer = [System.Xml.XmlWriter]::Create($outFile, $settings)

function Write-DirectoryNode {
  param(
    [System.Xml.XmlWriter]$Writer,
    [string]$DirectoryPath,
    [string]$DocsRootPath
  )

  $dirInfo = Get-Item -LiteralPath $DirectoryPath
  $docsRootAbs = (Resolve-Path -LiteralPath $DocsRootPath).Path
  $dirAbs = (Resolve-Path -LiteralPath $DirectoryPath).Path

  if ($dirAbs.StartsWith($docsRootAbs, [System.StringComparison]::OrdinalIgnoreCase)) {
    $relativeFromDocs = $dirAbs.Substring($docsRootAbs.Length).TrimStart('\\').Replace('\','/')
  }
  else {
    $relativeFromDocs = $dirInfo.Name
  }

  $pathAttr = if ([string]::IsNullOrWhiteSpace($relativeFromDocs) -or $relativeFromDocs -eq '.') { 'docs' } else { "docs/$relativeFromDocs" }

  $Writer.WriteStartElement('directory')
  $Writer.WriteAttributeString('name', $dirInfo.Name)
  $Writer.WriteAttributeString('path', $pathAttr)

  $children = Get-ChildItem -LiteralPath $DirectoryPath | Sort-Object @{Expression={$_.PSIsContainer};Descending=$true}, Name

  foreach ($child in $children) {
    if ($child.PSIsContainer) {
      Write-DirectoryNode -Writer $Writer -DirectoryPath $child.FullName -DocsRootPath $DocsRootPath
    }
    else {
      $childAbs = (Resolve-Path -LiteralPath $child.FullName).Path
      if ($childAbs.StartsWith($docsRootAbs, [System.StringComparison]::OrdinalIgnoreCase)) {
        $fileRelative = $childAbs.Substring($docsRootAbs.Length).TrimStart('\\').Replace('\','/')
      }
      else {
        $fileRelative = $child.Name
      }
      $Writer.WriteStartElement('file')
      $Writer.WriteAttributeString('name', $child.Name)
      $Writer.WriteAttributeString('path', "docs/$fileRelative")
      $Writer.WriteEndElement()
    }
  }

  $Writer.WriteEndElement()
}

$writer.WriteStartDocument()
$writer.WriteStartElement('docsTree')
$writer.WriteAttributeString('generatedAt', (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssK'))
Write-DirectoryNode -Writer $writer -DirectoryPath $docsRoot -DocsRootPath $docsRoot
$writer.WriteEndElement()
$writer.WriteEndDocument()
$writer.Flush()
$writer.Close()

Write-Output "Generated: $outFile"