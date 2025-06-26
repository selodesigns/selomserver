$dirs = @(
    "server\config",
    "server\routes",
    "server\services", 
    "server\models",
    "server\utils",
    "server\data\thumbnails",
    "server\data\streams",
    "server\data\cache",
    "web-client\src\components",
    "web-client\src\contexts",
    "web-client\src\services",
    "scripts",
    "docker"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path -Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir
        Write-Host "Created directory: $dir"
    } else {
        Write-Host "Directory already exists: $dir"
    }
}

Write-Host "`nDirectory structure:"
Get-ChildItem -Path . -Recurse -Directory | ForEach-Object {
    $indent = "  " * ($_.FullName.Split("\").Count - ($pwd.Path.Split("\").Count + 1))
    if ($indent -eq "") { $indent = "  " }
    Write-Host "$indent$($_.Name)"
}
