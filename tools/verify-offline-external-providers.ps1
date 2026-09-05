[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

$environmentNames = @(
    "GOOGLE_API_KEY",
    "GOOGLE_AI_API_KEY",
    "JC_AI_CONTENT_ANALYSIS_ENABLED",
    "JC_AI_CONTENT_ANALYSIS_WORKER_ENABLED",
    "VITE_GOOGLE_MAPS_API_KEY",
    "VITE_GOOGLE_OAUTH_CLIENT_ID"
)

$previousEnvironment = @{}
foreach ($name in $environmentNames) {
    $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}

try {
    # Deliberately invalid/absent provider credentials. These checks must pass
    # through mocks/fakes only and must never require live provider access.
    [Environment]::SetEnvironmentVariable("GOOGLE_API_KEY", "offline-placeholder", "Process")
    [Environment]::SetEnvironmentVariable("GOOGLE_AI_API_KEY", $null, "Process")
    [Environment]::SetEnvironmentVariable("JC_AI_CONTENT_ANALYSIS_ENABLED", "false", "Process")
    [Environment]::SetEnvironmentVariable("JC_AI_CONTENT_ANALYSIS_WORKER_ENABLED", "false", "Process")
    [Environment]::SetEnvironmentVariable("VITE_GOOGLE_MAPS_API_KEY", $null, "Process")
    [Environment]::SetEnvironmentVariable("VITE_GOOGLE_OAUTH_CLIENT_ID", $null, "Process")

    Push-Location (Join-Path $repoRoot "jc-backend")
    try {
        $backendTests = @(
            "com.jc.backend.google.GoogleLocationServiceTest",
            "com.jc.backend.intelligence.contentanalysis.ContentAnalysisRuntimeConfigurationTest",
            "com.jc.backend.intelligence.contentanalysis.PostContentAnalysisJobWorkerTest",
            "com.jc.backend.intelligence.journeyai.JourneyAiRuntimeConfigurationTest",
            "com.jc.backend.intelligence.journeyai.JourneyAiServiceTest"
        )

        $gradleArgs = @(":test", "--no-daemon")
        foreach ($test in $backendTests) {
            $gradleArgs += @("--tests", $test)
        }

        & .\gradlew.bat @gradleArgs
        if ($LASTEXITCODE -ne 0) {
            throw "Backend offline provider verification failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }

    Push-Location (Join-Path $repoRoot "jc-frontend")
    try {
        & npm.cmd run test -- src/services/journeyAiApi.test.js
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend offline provider verification failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host "OFFLINE_EXTERNAL_PROVIDER_VERIFICATION=PASS"
    Write-Host "LIVE_PROVIDER_VERIFICATION=NOT_RUN"
    Write-Host "Google/Gemini billing, quota, credentials, and live connectivity are intentionally not verified here."
}
finally {
    foreach ($name in $environmentNames) {
        [Environment]::SetEnvironmentVariable(
            $name,
            $previousEnvironment[$name],
            "Process")
    }
}
