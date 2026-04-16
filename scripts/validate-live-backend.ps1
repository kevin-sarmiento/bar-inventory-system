$ErrorActionPreference = 'Stop'

$baseUrl = 'http://localhost:8082'
$suffix = Get-Date -Format 'yyyyMMddHHmmss'
$today = Get-Date
$todayIsoDate = $today.ToString('yyyy-MM-dd')
$nowIso = $today.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Details
    )

    $results.Add([pscustomobject]@{
        name = $Name
        passed = $Passed
        details = $Details
    }) | Out-Null

    if ($Passed) {
        Write-Host "[OK] $Name - $Details" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $Name - $Details" -ForegroundColor Red
    }
}

function To-Array {
    param($Value)
    if ($null -eq $Value) { return @() }
    if ($Value -is [System.Array]) { return $Value }
    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) { return @($Value) }
    return @($Value)
}

function Build-QueryString {
    param([hashtable]$Query)

    if ($null -eq $Query -or $Query.Count -eq 0) {
        return ''
    }

    $pairs = foreach ($key in $Query.Keys) {
        $encodedKey = [System.Uri]::EscapeDataString([string]$key)
        $encodedValue = [System.Uri]::EscapeDataString([string]$Query[$key])
        "$encodedKey=$encodedValue"
    }
    return '?' + ($pairs -join '&')
}

function Parse-JsonSafe {
    param([string]$Raw)

    if ([string]::IsNullOrWhiteSpace($Raw)) {
        return $null
    }

    try {
        return $Raw | ConvertFrom-Json
    } catch {
        return $Raw
    }
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Token,
        $Body,
        [hashtable]$Query
    )

    $queryString = Build-QueryString -Query $Query
    $uri = "$baseUrl$Path$queryString"
    $headers = @{}
    if ($Token) {
        $headers['Authorization'] = "Bearer $Token"
    }

    $requestParams = @{
        Uri = $uri
        Method = $Method
        UseBasicParsing = $true
        TimeoutSec = 30
        Headers = $headers
    }

    if ($null -ne $Body) {
        $requestParams['ContentType'] = 'application/json'
        $requestParams['Body'] = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        $response = Invoke-WebRequest @requestParams
        [pscustomobject]@{
            ok = $true
            status = [int]$response.StatusCode
            data = Parse-JsonSafe -Raw $response.Content
            raw = $response.Content
            uri = $uri
        }
    } catch {
        $statusCode = 0
        $raw = $_.Exception.Message
        if ($_.Exception.Response -ne $null) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream -ne $null) {
                $reader = New-Object System.IO.StreamReader($stream)
                $raw = $reader.ReadToEnd()
                $reader.Dispose()
            }
        }
        [pscustomobject]@{
            ok = $false
            status = $statusCode
            data = Parse-JsonSafe -Raw $raw
            raw = $raw
            uri = $uri
        }
    }
}

function Assert-Status {
    param(
        [string]$Name,
        $Response,
        [int[]]$ExpectedStatuses
    )

    $passed = $ExpectedStatuses -contains [int]$Response.status
    Add-Result -Name $Name -Passed $passed -Details ("estado={0}; esperado={1}; uri={2}" -f $Response.status, ($ExpectedStatuses -join ','), $Response.uri)
    return $passed
}

function Require-Success {
    param(
        [string]$Name,
        $Response,
        [int[]]$ExpectedStatuses
    )

    $ok = Assert-Status -Name $Name -Response $Response -ExpectedStatuses $ExpectedStatuses
    if (-not $ok) {
        throw "$Name fallo: $($Response.raw)"
    }
}

function Login {
    param(
        [string]$Username,
        [string]$Password
    )

    $response = Invoke-Api -Method 'POST' -Path '/api/auth/login' -Body @{
        username = $Username
        password = $Password
    }

    if (-not $response.ok -or -not $response.data.token) {
        throw "Login falló para ${Username}: $($response.raw)"
    }
    return $response.data.token
}

function Ensure-UserForRole {
    param(
        [string]$AdminToken,
        [string]$Username,
        [string]$Password,
        [string]$FullName,
        [string]$RoleName
    )

    $usersResponse = Invoke-Api -Method 'GET' -Path '/api/users' -Token $AdminToken
    Require-Success -Name "Listar usuarios para validar $Username" -Response $usersResponse -ExpectedStatuses @(200)
    $users = To-Array $usersResponse.data
    $user = $users | Where-Object { $_.username -eq $Username } | Select-Object -First 1

    if ($null -eq $user) {
        $createResponse = Invoke-Api -Method 'POST' -Path '/api/users' -Token $AdminToken -Body @{
            username = $Username
            fullName = $FullName
            email = "$Username@sake.local"
            password = $Password
            active = $true
            roleNames = @($RoleName)
        }
        Require-Success -Name "Crear usuario $Username" -Response $createResponse -ExpectedStatuses @(201)
        $user = $createResponse.data
    }

    if (-not $user.active) {
        $activateResponse = Invoke-Api -Method 'PATCH' -Path ('/api/users/' + $user.id + '/active') -Token $AdminToken -Query @{ value = 'true' }
        Require-Success -Name "Activar usuario $Username" -Response $activateResponse -ExpectedStatuses @(200)
        $user = $activateResponse.data
    }

    $roleNames = @()
    if ($null -ne $user.roles) {
        $roleNames = To-Array $user.roles
    }
    if (-not ($roleNames -contains $RoleName)) {
        $assignResponse = Invoke-Api -Method 'PUT' -Path ('/api/users/' + $user.id + '/roles') -Token $AdminToken -Body @{
            roleNames = @($RoleName)
        }
        Require-Success -Name "Asignar rol $RoleName a $Username" -Response $assignResponse -ExpectedStatuses @(200)
        $user = $assignResponse.data
    }

    return $user
}

function Main {
    $health = Invoke-Api -Method 'GET' -Path '/swagger-ui.html'
    Require-Success -Name 'Backend real responde en 8082' -Response $health -ExpectedStatuses @(200)

    $adminToken = Login -Username 'admin' -Password 'admin123'
    Add-Result -Name 'Login admin' -Passed $true -Details 'token recibido'

    $gerenteUser = Ensure-UserForRole -AdminToken $adminToken -Username 'gerente' -Password 'Gerente123' -FullName 'Gerente Principal' -RoleName 'GERENTE'
    $inventarioUser = Ensure-UserForRole -AdminToken $adminToken -Username 'inventario' -Password 'Inventario123' -FullName 'Inventario Principal' -RoleName 'INVENTARIO'
    $cajeroUser = Ensure-UserForRole -AdminToken $adminToken -Username 'cajero' -Password 'Cajero123' -FullName 'Cajero Principal' -RoleName 'CAJERO'
    $bartenderUser = Ensure-UserForRole -AdminToken $adminToken -Username 'bartender' -Password 'Bartender123' -FullName 'Bartender Principal' -RoleName 'BARTENDER'

    $gerenteToken = Login -Username 'gerente' -Password 'Gerente123'
    Add-Result -Name 'Login gerente' -Passed $true -Details 'token recibido'
    $inventarioToken = Login -Username 'inventario' -Password 'Inventario123'
    Add-Result -Name 'Login inventario' -Passed $true -Details 'token recibido'
    $cajeroToken = Login -Username 'cajero' -Password 'Cajero123'
    Add-Result -Name 'Login cajero' -Passed $true -Details 'token recibido'
    $bartenderToken = Login -Username 'bartender' -Password 'Bartender123'
    Add-Result -Name 'Login bartender' -Passed $true -Details 'token recibido'

    $categoryResponse = Invoke-Api -Method 'POST' -Path '/api/categories' -Token $adminToken -Body @{
        name = "Categoria QA $suffix"
        description = 'Categoria creada por validacion en vivo'
    }
    Require-Success -Name 'Crear categoria' -Response $categoryResponse -ExpectedStatuses @(201)
    $category = $categoryResponse.data

    $categoryUpdateResponse = Invoke-Api -Method 'PUT' -Path ('/api/categories/' + $category.id) -Token $inventarioToken -Body @{
        id = $category.id
        name = "Categoria QA $suffix"
        description = 'Categoria actualizada por inventario'
    }
    Require-Success -Name 'Inventario actualiza categoria' -Response $categoryUpdateResponse -ExpectedStatuses @(200)

    $unitResponse = Invoke-Api -Method 'POST' -Path '/api/units' -Token $adminToken -Body @{
        code = "qa$suffix"
        name = "Unidad QA $suffix"
        unitType = 'COUNT'
    }
    Require-Success -Name 'Crear unidad' -Response $unitResponse -ExpectedStatuses @(201)
    $unit = $unitResponse.data

    $unitUpdateResponse = Invoke-Api -Method 'PUT' -Path ('/api/units/' + $unit.id) -Token $inventarioToken -Body @{
        id = $unit.id
        code = "qa$suffix"
        name = "Unidad QA Actualizada $suffix"
        unitType = 'COUNT'
    }
    Require-Success -Name 'Inventario actualiza unidad' -Response $unitUpdateResponse -ExpectedStatuses @(200)

    $supplierResponse = Invoke-Api -Method 'POST' -Path '/api/suppliers' -Token $adminToken -Body @{
        name = "Proveedor QA $suffix"
        email = "proveedor$suffix@sake.local"
        phone = '3000000000'
        address = 'Direccion QA'
    }
    Require-Success -Name 'Crear proveedor' -Response $supplierResponse -ExpectedStatuses @(201)
    $supplier = $supplierResponse.data

    $supplierUpdateResponse = Invoke-Api -Method 'PUT' -Path ('/api/suppliers/' + $supplier.id) -Token $inventarioToken -Body @{
        id = $supplier.id
        name = "Proveedor QA $suffix"
        email = "proveedor$suffix@sake.local"
        phone = '3111111111'
        address = 'Direccion QA Actualizada'
    }
    Require-Success -Name 'Inventario actualiza proveedor' -Response $supplierUpdateResponse -ExpectedStatuses @(200)

    $locationResponse = Invoke-Api -Method 'POST' -Path '/api/locations' -Token $adminToken -Body @{
        locationName = "Ubicacion QA $suffix"
        locationType = 'BAR'
        description = 'Ubicacion para validacion en vivo'
        active = $true
    }
    Require-Success -Name 'Crear ubicacion' -Response $locationResponse -ExpectedStatuses @(201)
    $location = $locationResponse.data

    $locationUpdateResponse = Invoke-Api -Method 'PUT' -Path ('/api/locations/' + $location.id) -Token $inventarioToken -Body @{
        id = $location.id
        locationName = "Ubicacion QA $suffix"
        locationType = 'BAR'
        description = 'Ubicacion actualizada por inventario'
        active = $true
    }
    $null = Assert-Status -Name 'Inventario actualiza ubicacion' -Response $locationUpdateResponse -ExpectedStatuses @(200)

    $productResponse = Invoke-Api -Method 'POST' -Path '/api/products' -Token $adminToken -Body @{
        sku = "SKU-$suffix"
        name = "Producto QA $suffix"
        categoryId = $category.id
        baseUnitId = $unit.id
        minStockBaseQty = 5
        barcode = "BAR-$suffix"
        active = $true
        notes = 'Producto para validacion en vivo'
    }
    Require-Success -Name 'Crear producto' -Response $productResponse -ExpectedStatuses @(201)
    $product = $productResponse.data

    $productUpdateResponse = Invoke-Api -Method 'PUT' -Path ('/api/products/' + $product.id) -Token $inventarioToken -Body @{
        id = $product.id
        sku = "SKU-$suffix"
        name = "Producto QA Actualizado $suffix"
        categoryId = $category.id
        baseUnitId = $unit.id
        minStockBaseQty = 7
        barcode = "BAR-$suffix"
        active = $true
        notes = 'Actualizado por inventario'
    }
    $null = Assert-Status -Name 'Inventario actualiza producto' -Response $productUpdateResponse -ExpectedStatuses @(200)
    if ($productUpdateResponse.ok -and $productUpdateResponse.status -eq 200) {
        $product = $productUpdateResponse.data
    }

    $recipeResponse = Invoke-Api -Method 'POST' -Path '/api/recipes' -Token $inventarioToken -Body @{
        recipeName = "Receta QA $suffix"
        description = 'Receta creada por inventario'
        active = $true
    }
    Require-Success -Name 'Inventario crea receta' -Response $recipeResponse -ExpectedStatuses @(201)
    $recipe = $recipeResponse.data

    $recipeItemResponse = Invoke-Api -Method 'POST' -Path ('/api/recipes/' + $recipe.id + '/items') -Token $inventarioToken -Body @{
        recipeId = $recipe.id
        productId = $product.id
        unitId = $unit.id
        quantity = 1
    }
    Require-Success -Name 'Inventario agrega item a receta' -Response $recipeItemResponse -ExpectedStatuses @(201)
    $recipeItem = $recipeItemResponse.data

    $menuResponse = Invoke-Api -Method 'POST' -Path '/api/menu-items' -Token $inventarioToken -Body @{
        menuName = "Menu QA $suffix"
        recipeId = $recipe.id
        salePrice = 18
        active = $true
    }
    Require-Success -Name 'Inventario crea item de menu' -Response $menuResponse -ExpectedStatuses @(201)
    $menuItem = $menuResponse.data

    $menuUpdateResponse = Invoke-Api -Method 'PUT' -Path ('/api/menu-items/' + $menuItem.id) -Token $inventarioToken -Body @{
        id = $menuItem.id
        menuName = "Menu QA Actualizado $suffix"
        recipeId = $recipe.id
        salePrice = 19
        active = $true
    }
    $null = Assert-Status -Name 'Inventario actualiza item de menu' -Response $menuUpdateResponse -ExpectedStatuses @(200)
    if ($menuUpdateResponse.ok -and $menuUpdateResponse.status -eq 200) {
        $menuItem = $menuUpdateResponse.data
    }

    $openingTxnResponse = Invoke-Api -Method 'POST' -Path '/api/transactions' -Token $inventarioToken -Body @{
        transactionNumber = "TXN-OPEN-$suffix"
        transactionType = 'OPENING_STOCK'
        transactionDate = $nowIso
        targetLocationId = $location.id
        reason = 'Stock inicial para validacion'
        status = 'POSTED'
        createdBy = $inventarioUser.id
        items = @(
            @{
                productId = $product.id
                unitId = $unit.id
                quantity = 120
                unitCost = 4
                notes = 'Carga inicial'
            }
        )
    }
    Require-Success -Name 'Inventario crea transaccion de stock inicial' -Response $openingTxnResponse -ExpectedStatuses @(201)
    $openingTxn = $openingTxnResponse.data

    $draftTxnResponse = Invoke-Api -Method 'POST' -Path '/api/transactions' -Token $inventarioToken -Body @{
        transactionNumber = "TXN-DRF-$suffix"
        transactionType = 'ADJUSTMENT_IN'
        transactionDate = $nowIso
        targetLocationId = $location.id
        reason = 'Transaccion en borrador para gerente'
        status = 'DRAFT'
        createdBy = $inventarioUser.id
        items = @(
            @{
                productId = $product.id
                unitId = $unit.id
                quantity = 3
                unitCost = 4
                notes = 'Borrador'
            }
        )
    }
    Require-Success -Name 'Inventario crea transaccion draft' -Response $draftTxnResponse -ExpectedStatuses @(201)
    $draftTxn = $draftTxnResponse.data

    $gerentePostsDraftResponse = Invoke-Api -Method 'PATCH' -Path ('/api/transactions/' + $draftTxn.id + '/status') -Token $gerenteToken -Query @{ value = 'POSTED' }
    Require-Success -Name 'Gerente publica transaccion draft' -Response $gerentePostsDraftResponse -ExpectedStatuses @(200)

    $bartenderCreateTxnForbidden = Invoke-Api -Method 'POST' -Path '/api/transactions' -Token $bartenderToken -Body @{
        transactionNumber = "TXN-BAD-$suffix"
        transactionType = 'ADJUSTMENT_IN'
        transactionDate = $nowIso
        targetLocationId = $location.id
        reason = 'No debe permitir bartender'
        items = @(
            @{
                productId = $product.id
                unitId = $unit.id
                quantity = 1
                unitCost = 1
            }
        )
    }
    $null = Assert-Status -Name 'Bartender no puede crear transacciones' -Response $bartenderCreateTxnForbidden -ExpectedStatuses @(403)

    $shiftBase = (Get-Date).AddDays(1).AddMinutes(([int]$suffix.Substring($suffix.Length - 2)))
    $shiftStart = $shiftBase.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    $shiftEnd = $shiftBase.AddHours(8).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')

    $cajeroShiftResponse = Invoke-Api -Method 'POST' -Path '/api/shifts' -Token $adminToken -Body @{
        userId = $cajeroUser.id
        locationId = $location.id
        roleName = 'CAJERO'
        scheduledStart = $shiftStart
        scheduledEnd = $shiftEnd
        notes = 'Turno cajero QA'
    }
    Require-Success -Name 'Crear turno para cajero' -Response $cajeroShiftResponse -ExpectedStatuses @(201)
    $cajeroShift = $cajeroShiftResponse.data

    $bartenderShiftResponse = Invoke-Api -Method 'POST' -Path '/api/shifts' -Token $adminToken -Body @{
        userId = $bartenderUser.id
        locationId = $location.id
        roleName = 'BARTENDER'
        scheduledStart = $shiftStart
        scheduledEnd = $shiftEnd
        notes = 'Turno bartender QA'
    }
    Require-Success -Name 'Crear turno para bartender' -Response $bartenderShiftResponse -ExpectedStatuses @(201)
    $bartenderShift = $bartenderShiftResponse.data

    $inventarioShiftResponse = Invoke-Api -Method 'POST' -Path '/api/shifts' -Token $adminToken -Body @{
        userId = $inventarioUser.id
        locationId = $location.id
        roleName = 'INVENTARIO'
        scheduledStart = $shiftStart
        scheduledEnd = $shiftEnd
        notes = 'Turno inventario QA'
    }
    Require-Success -Name 'Crear turno para inventario' -Response $inventarioShiftResponse -ExpectedStatuses @(201)
    $inventarioShift = $inventarioShiftResponse.data

    $gerenteShiftList = Invoke-Api -Method 'GET' -Path '/api/shifts' -Token $gerenteToken
    Require-Success -Name 'Gerente consulta turnos' -Response $gerenteShiftList -ExpectedStatuses @(200)

    $cajeroMyShifts = Invoke-Api -Method 'GET' -Path '/api/shifts/me' -Token $cajeroToken
    Require-Success -Name 'Cajero consulta sus turnos' -Response $cajeroMyShifts -ExpectedStatuses @(200)

    $cajeroCheckIn = Invoke-Api -Method 'POST' -Path ('/api/shifts/' + $cajeroShift.id + '/check-in') -Token $cajeroToken
    Require-Success -Name 'Cajero hace check-in' -Response $cajeroCheckIn -ExpectedStatuses @(200)

    Start-Sleep -Seconds 1

    $bartenderCheckIn = Invoke-Api -Method 'POST' -Path ('/api/shifts/' + $bartenderShift.id + '/check-in') -Token $bartenderToken
    Require-Success -Name 'Bartender hace check-in' -Response $bartenderCheckIn -ExpectedStatuses @(200)

    $saleCajeroResponse = Invoke-Api -Method 'POST' -Path '/api/sales' -Token $cajeroToken -Body @{
        saleNumber = "SALE-CAJ-$suffix"
        saleDatetime = $nowIso
        locationId = $location.id
        cashierUserId = $cajeroUser.id
        shiftId = $cajeroShift.id
        totalAmount = 19
        status = 'PAID'
        processInventory = $false
        items = @(
            @{
                menuItemId = $menuItem.id
                quantity = 1
                unitPrice = 19
            }
        )
    }
    Require-Success -Name 'Cajero crea venta' -Response $saleCajeroResponse -ExpectedStatuses @(201)
    $saleCajero = $saleCajeroResponse.data

    Start-Sleep -Seconds 1

    $cajeroCheckOut = Invoke-Api -Method 'POST' -Path ('/api/shifts/' + $cajeroShift.id + '/check-out') -Token $cajeroToken
    Require-Success -Name 'Cajero hace check-out' -Response $cajeroCheckOut -ExpectedStatuses @(200)

    $saleBartenderResponse = Invoke-Api -Method 'POST' -Path '/api/sales' -Token $bartenderToken -Body @{
        saleNumber = "SALE-BAR-$suffix"
        saleDatetime = $nowIso
        locationId = $location.id
        cashierUserId = $bartenderUser.id
        shiftId = $bartenderShift.id
        totalAmount = 19
        status = 'PAID'
        processInventory = $false
        items = @(
            @{
                menuItemId = $menuItem.id
                quantity = 1
                unitPrice = 19
            }
        )
    }
    Require-Success -Name 'Bartender crea venta' -Response $saleBartenderResponse -ExpectedStatuses @(201)
    $saleBartender = $saleBartenderResponse.data

    $gerenteCreateSaleForbidden = Invoke-Api -Method 'POST' -Path '/api/sales' -Token $gerenteToken -Body @{
        saleNumber = "SALE-GER-$suffix"
        saleDatetime = $nowIso
        locationId = $location.id
        cashierUserId = $gerenteUser.id
        totalAmount = 1
        items = @(
            @{
                productId = $product.id
                unitId = $unit.id
                quantity = 1
                unitPrice = 1
            }
        )
    }
    $null = Assert-Status -Name 'Gerente no puede crear ventas' -Response $gerenteCreateSaleForbidden -ExpectedStatuses @(403)

    $postInventoryResponse = Invoke-Api -Method 'POST' -Path ('/api/sales/' + $saleCajero.id + '/post-inventory') -Token $inventarioToken -Query @{ userId = [string]$inventarioUser.id }
    Require-Success -Name 'Inventario procesa inventario de venta' -Response $postInventoryResponse -ExpectedStatuses @(200)

    $countResponse = Invoke-Api -Method 'POST' -Path '/api/physical-counts' -Token $inventarioToken -Body @{
        countNumber = "CNT-$suffix"
        locationId = $location.id
        countDate = $nowIso
        notes = 'Conteo QA'
        createdBy = $inventarioUser.id
        items = @(
            @{
                productId = $product.id
                theoreticalQtyBase = 122
                actualQtyBase = 118
                notes = 'Diferencia de prueba'
            }
        )
    }
    Require-Success -Name 'Inventario crea conteo fisico' -Response $countResponse -ExpectedStatuses @(201)
    $count = $countResponse.data

    $gerenteCloseCount = Invoke-Api -Method 'POST' -Path ('/api/physical-counts/' + $count.id + '/close') -Token $gerenteToken -Query @{ userId = [string]$gerenteUser.id }
    Require-Success -Name 'Gerente cierra conteo fisico' -Response $gerenteCloseCount -ExpectedStatuses @(200)

    $cajeroCreateCountForbidden = Invoke-Api -Method 'POST' -Path '/api/physical-counts' -Token $cajeroToken -Body @{
        countNumber = "CNT-BAD-$suffix"
        locationId = $location.id
        countDate = $nowIso
        items = @(
            @{
                productId = $product.id
                theoreticalQtyBase = 1
                actualQtyBase = 1
            }
        )
    }
    $null = Assert-Status -Name 'Cajero no puede crear conteos' -Response $cajeroCreateCountForbidden -ExpectedStatuses @(403)

    $stockBalancesResponse = Invoke-Api -Method 'GET' -Path '/api/stock-balances' -Token $bartenderToken
    Require-Success -Name 'Bartender consulta stock balances' -Response $stockBalancesResponse -ExpectedStatuses @(200)

    $salesListResponse = Invoke-Api -Method 'GET' -Path '/api/sales' -Token $gerenteToken
    Require-Success -Name 'Gerente consulta ventas' -Response $salesListResponse -ExpectedStatuses @(200)

    $transactionsListResponse = Invoke-Api -Method 'GET' -Path '/api/transactions' -Token $bartenderToken
    Require-Success -Name 'Bartender consulta transacciones' -Response $transactionsListResponse -ExpectedStatuses @(200)

    $reportsStockResponse = Invoke-Api -Method 'GET' -Path '/api/reports/stock' -Token $inventarioToken -Query @{ locationId = [string]$location.id }
    Require-Success -Name 'Inventario consulta reporte de stock' -Response $reportsStockResponse -ExpectedStatuses @(200)

    $reportsDashboardResponse = Invoke-Api -Method 'GET' -Path '/api/reports/dashboard/daily' -Token $inventarioToken -Query @{ date = $todayIsoDate; locationId = [string]$location.id }
    Require-Success -Name 'Inventario consulta dashboard diario' -Response $reportsDashboardResponse -ExpectedStatuses @(200)

    $reportsMovementsResponse = Invoke-Api -Method 'GET' -Path '/api/reports/movements' -Token $inventarioToken -Query @{ from = $todayIsoDate; to = $todayIsoDate }
    Require-Success -Name 'Inventario consulta movimientos' -Response $reportsMovementsResponse -ExpectedStatuses @(200)

    $reportsWasteResponse = Invoke-Api -Method 'GET' -Path '/api/reports/waste' -Token $inventarioToken -Query @{ from = $todayIsoDate; to = $todayIsoDate }
    Require-Success -Name 'Inventario consulta reporte de merma' -Response $reportsWasteResponse -ExpectedStatuses @(200)

    $reportsConsumptionResponse = Invoke-Api -Method 'GET' -Path '/api/reports/consumption' -Token $inventarioToken -Query @{ from = $todayIsoDate; to = $todayIsoDate }
    Require-Success -Name 'Inventario consulta consumo' -Response $reportsConsumptionResponse -ExpectedStatuses @(200)

    $reportsDiffResponse = Invoke-Api -Method 'GET' -Path '/api/reports/count-differences' -Token $inventarioToken
    Require-Success -Name 'Inventario consulta diferencias de conteo' -Response $reportsDiffResponse -ExpectedStatuses @(200)

    $reportsValuationResponse = Invoke-Api -Method 'GET' -Path '/api/reports/inventory-valuation' -Token $inventarioToken
    Require-Success -Name 'Inventario consulta valorizacion de inventario' -Response $reportsValuationResponse -ExpectedStatuses @(200)

    $auditResponse = Invoke-Api -Method 'GET' -Path '/api/reports/audit' -Token $gerenteToken
    Require-Success -Name 'Gerente consulta auditoria' -Response $auditResponse -ExpectedStatuses @(200)

    $auditForbiddenResponse = Invoke-Api -Method 'GET' -Path '/api/reports/audit' -Token $inventarioToken
    $null = Assert-Status -Name 'Inventario no puede consultar auditoria' -Response $auditForbiddenResponse -ExpectedStatuses @(403)

    $shiftReportResponse = Invoke-Api -Method 'GET' -Path '/api/reports/shifts' -Token $gerenteToken -Query @{ from = $todayIsoDate; to = $todayIsoDate }
    Require-Success -Name 'Gerente consulta reporte de turnos' -Response $shiftReportResponse -ExpectedStatuses @(200)

    $shiftByUserCsvResponse = Invoke-Api -Method 'GET' -Path '/api/reports/shifts/by-user/export' -Token $gerenteToken -Query @{ from = $todayIsoDate; to = $todayIsoDate; locationId = [string]$location.id }
    Require-Success -Name 'Gerente exporta ventas por usuario en CSV' -Response $shiftByUserCsvResponse -ExpectedStatuses @(200)

    $stockExportResponse = Invoke-Api -Method 'GET' -Path '/api/reports/stock/export.xlsx' -Token $inventarioToken -Query @{ locationId = [string]$location.id }
    Require-Success -Name 'Inventario exporta stock en Excel' -Response $stockExportResponse -ExpectedStatuses @(200)

    $gerenteUsersForbidden = Invoke-Api -Method 'GET' -Path '/api/users' -Token $gerenteToken
    $null = Assert-Status -Name 'Gerente no puede listar usuarios' -Response $gerenteUsersForbidden -ExpectedStatuses @(403)

    $cajeroReportForbidden = Invoke-Api -Method 'GET' -Path '/api/reports/stock' -Token $cajeroToken
    $null = Assert-Status -Name 'Cajero no puede ver reportes de stock' -Response $cajeroReportForbidden -ExpectedStatuses @(403)

    $cajeroCategoryForbidden = Invoke-Api -Method 'POST' -Path '/api/categories' -Token $cajeroToken -Body @{
        name = "Categoria prohibida $suffix"
        description = 'No debe permitir cajero'
    }
    $null = Assert-Status -Name 'Cajero no puede crear categorias' -Response $cajeroCategoryForbidden -ExpectedStatuses @(403)

    $recipeItemsListResponse = Invoke-Api -Method 'GET' -Path ('/api/recipes/' + $recipe.id + '/items') -Token $cajeroToken
    Require-Success -Name 'Usuario autenticado consulta items de receta' -Response $recipeItemsListResponse -ExpectedStatuses @(200)

    $deleteRecipeItemResponse = Invoke-Api -Method 'DELETE' -Path ('/api/recipes/items/' + $recipeItem.id) -Token $inventarioToken
    Require-Success -Name 'Inventario elimina item de receta' -Response $deleteRecipeItemResponse -ExpectedStatuses @(204)

    $listCategoriesResponse = Invoke-Api -Method 'GET' -Path '/api/categories' -Token $bartenderToken
    Require-Success -Name 'Bartender consulta categorias' -Response $listCategoriesResponse -ExpectedStatuses @(200)

    $listUnitsResponse = Invoke-Api -Method 'GET' -Path '/api/units' -Token $cajeroToken
    Require-Success -Name 'Cajero consulta unidades' -Response $listUnitsResponse -ExpectedStatuses @(200)

    $listLocationsResponse = Invoke-Api -Method 'GET' -Path '/api/locations' -Token $bartenderToken
    Require-Success -Name 'Bartender consulta ubicaciones' -Response $listLocationsResponse -ExpectedStatuses @(200)

    $listProductsResponse = Invoke-Api -Method 'GET' -Path '/api/products' -Token $gerenteToken
    Require-Success -Name 'Gerente consulta productos' -Response $listProductsResponse -ExpectedStatuses @(200)

    $listRecipesResponse = Invoke-Api -Method 'GET' -Path '/api/recipes' -Token $cajeroToken
    Require-Success -Name 'Cajero consulta recetas' -Response $listRecipesResponse -ExpectedStatuses @(200)

    $listMenuResponse = Invoke-Api -Method 'GET' -Path '/api/menu-items' -Token $bartenderToken
    Require-Success -Name 'Bartender consulta menu' -Response $listMenuResponse -ExpectedStatuses @(200)

    $passed = ($results | Where-Object { -not $_.passed }).Count -eq 0
    Write-Host ''
    Write-Host '==== RESUMEN VALIDACION EN VIVO ====' -ForegroundColor Cyan
    Write-Host ("Total: {0}" -f $results.Count)
    Write-Host ("Exitosas: {0}" -f (($results | Where-Object { $_.passed }).Count))
    Write-Host ("Fallidas: {0}" -f (($results | Where-Object { -not $_.passed }).Count))

    if (-not $passed) {
        exit 1
    }
}

Main
