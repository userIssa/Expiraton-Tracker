Write-Host "Starting Authentication & RBAC Verification Tests..." -ForegroundColor Cyan

# Test 1: Access protected API route without authentication
Write-Host "`n[Test 1] Accessing protected API route /api/products without credentials..." -ForegroundColor Yellow
try {
    $res = Invoke-WebRequest -Uri "http://localhost:3000/api/products" -Method GET -ErrorAction Stop
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $responseBody = [System.IO.StreamReader]($_.Exception.Response.GetResponseStream())
    $content = $responseBody.ReadToEnd()
    Write-Host "Response Code: $statusCode" -ForegroundColor Green
    Write-Host "Response Body: $content" -ForegroundColor Green
}

# Test 2: Attempt Login with invalid credentials
Write-Host "`n[Test 2] Attempting login with invalid credentials..." -ForegroundColor Yellow
$loginData = @{
    email = "storehand1@example.com"
    password = "WrongPassword"
} | ConvertTo-Json

try {
    $res = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -ErrorAction Stop
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $responseBody = [System.IO.StreamReader]($_.Exception.Response.GetResponseStream())
    $content = $responseBody.ReadToEnd()
    Write-Host "Response Code: $statusCode" -ForegroundColor Green
    Write-Host "Response Body: $content" -ForegroundColor Green
}

# Test 3: Login with correct credentials (Store-hand)
Write-Host "`n[Test 3] Logging in with correct Store-hand credentials..." -ForegroundColor Yellow
$loginDataCorrect = @{
    email = "storehand1@example.com"
    password = "Password123"
} | ConvertTo-Json

$session = $null
$res = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginDataCorrect -ContentType "application/json" -SessionVariable session
Write-Host "Response Code: $($res.StatusCode)" -ForegroundColor Green
Write-Host "Response Body: $($res.Content)" -ForegroundColor Green

# Test 4: Access /api/auth/me with active session
Write-Host "`n[Test 4] Requesting /api/auth/me to verify session..." -ForegroundColor Yellow
$resMe = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method GET -WebSession $session
Write-Host "Result: $(ConvertTo-Json $resMe)" -ForegroundColor Green

# Test 5: Logout
Write-Host "`n[Test 5] Logging out..." -ForegroundColor Yellow
$resLogout = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/logout" -Method POST -WebSession $session
Write-Host "Response Code: $($resLogout.StatusCode)" -ForegroundColor Green
Write-Host "Response Body: $($resLogout.Content)" -ForegroundColor Green

# Test 6: Verify session is cleared
Write-Host "`n[Test 6] Verifying session is cleared (calling /api/auth/me)..." -ForegroundColor Yellow
try {
    $resMeCleared = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/me" -Method GET -WebSession $session -ErrorAction Stop
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $responseBody = [System.IO.StreamReader]($_.Exception.Response.GetResponseStream())
    $content = $responseBody.ReadToEnd()
    Write-Host "Response Code: $statusCode" -ForegroundColor Green
    Write-Host "Response Body: $content" -ForegroundColor Green
}

Write-Host "`nAll tests completed!" -ForegroundColor Cyan
