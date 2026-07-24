$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "jc-backend"
$frontendPath = Join-Path $projectRoot "jc-frontend"

# PostgreSQL 실행 보장
$postgres = Get-Service "postgresql-x64-18" -ErrorAction SilentlyContinue

if ($null -eq $postgres) {
    Write-Host "PostgreSQL 서비스를 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

if ($postgres.Status -ne "Running") {
    Write-Host "PostgreSQL을 시작합니다..."
    Start-Service "postgresql-x64-18"
}

# 백엔드 실행
$backendCommand = @"
Set-Location '$backendPath'
`$env:DB_HOST='127.0.0.1'
`$env:DB_PORT='5432'
`$env:DB_NAME='journey_db'
`$env:DB_USERNAME='postgres'
`$env:DB_PASSWORD='2357'
.\gradlew.bat bootRun
"@

Start-Process powershell -ArgumentList `
    "-NoExit", `
    "-ExecutionPolicy", "Bypass", `
    "-Command", $backendCommand

# 프론트엔드 실행
$frontendCommand = @"
Set-Location '$frontendPath'

if (-not (Test-Path 'node_modules')) {
    npm install
}

npm run dev
"@

Start-Process powershell -ArgumentList `
    "-NoExit", `
    "-ExecutionPolicy", "Bypass", `
    "-Command", $frontendCommand

Write-Host "Journey Connect 로컬 환경을 실행했습니다." -ForegroundColor Green
Write-Host "Backend : http://localhost:8080"
Write-Host "Frontend: http://localhost:5173"