# Supabase local start script
# Workaround: gotrue:v2.189.0 crashes (SIGBUS) on Docker Desktop 4.75.0 + WSL2.
# We tag a working older version as the expected tag before starting.

$GOTRUE_WORKING = "public.ecr.aws/supabase/gotrue:v2.157.0"
$GOTRUE_EXPECTED = "public.ecr.aws/supabase/gotrue:v2.189.0"

Write-Host "Checking GoTrue compatibility..."

$testResult = docker run --rm $GOTRUE_EXPECTED gotrue version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "GoTrue $GOTRUE_EXPECTED is broken (exit $LASTEXITCODE). Pulling working version..."
    docker pull $GOTRUE_WORKING
    docker tag $GOTRUE_WORKING $GOTRUE_EXPECTED
    Write-Host "Tagged $GOTRUE_WORKING as $GOTRUE_EXPECTED"
}

Write-Host "Starting Supabase..."
supabase start
