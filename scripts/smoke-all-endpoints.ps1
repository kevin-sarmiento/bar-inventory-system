$ErrorActionPreference = 'Stop'

$baseUrl = 'http://localhost:8082'
$results = [System.Collections.Generic.List[object]]::new()
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

function Add-Result {
    param(
        [string]$Name,
        [bool]$Ok,
        [int]$StatusCode,
        [string]$Detail
    )

    $results.Add([PSCustomObject]@{
            name       = $Name
            ok         = $Ok
            statusCode = $StatusCode
            detail     = $Detail
        })
}

function Read-ErrorBody {
    param($ErrorRecord)

    if ($ErrorRecord.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($ErrorRecord.Exception.Response.GetResponseStream())
            return $reader.ReadToEnd()
        }
        catch {
            return $ErrorRecord.Exception.Message
        }
    }
    return $ErrorRecord.Exception.Message
}

function Invoke-JsonApi {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        $Body = $null
    )

    try {
        $params = @{
            Method      = $Method
            Uri         = $Url
            Headers     = $Headers
            ContentType = 'application/json'
        }
        if ($null -ne $Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        $response = Invoke-WebRequest -UseBasicParsing @params
        $parsedBody = $null
        if ($response.Content) {
            try {
                $parsedBody = $response.Content | ConvertFrom-Json
            }
            catch {
                $parsedBody = $response.Content
            }
        }
        Add-Result -Name $Name -Ok $true -StatusCode ([int]$response.StatusCode) -Detail $Url
        return [PSCustomObject]@{
            statusCode = [int]$response.StatusCode
            body       = $parsedBody
            headers    = $response.Headers
            raw        = $response
        }
    }
    catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        Add-Result -Name $Name -Ok $false -StatusCode $statusCode -Detail (Read-ErrorBody $_)
        throw
    }
}

function Invoke-FileApi {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers,
        [string]$OutFile
    )

    try {
        if (Test-Path $OutFile) {
            Remove-Item -LiteralPath $OutFile -Force
        }
        $response = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $Url -Headers $Headers -OutFile $OutFile -PassThru
        Add-Result -Name $Name -Ok $true -StatusCode ([int]$response.StatusCode) -Detail $Url
        return $response
    }
    catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        Add-Result -Name $Name -Ok $false -StatusCode $statusCode -Detail (Read-ErrorBody $_)
        throw
    }
}

function Invoke-DeleteApi {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers
    )

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Method Delete -Uri $Url -Headers $Headers
        Add-Result -Name $Name -Ok $true -StatusCode ([int]$response.StatusCode) -Detail $Url
        return $response
    }
    catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        Add-Result -Name $Name -Ok $false -StatusCode $statusCode -Detail (Read-ErrorBody $_)
        throw
    }
}

$login = Invoke-JsonApi -Name 'POST /api/auth/login (admin)' -Method Post -Url "$baseUrl/api/auth/login" -Body @{
    username = 'admin'
    password = 'admin123'
}
$adminHeaders = @{ Authorization = "Bearer $($login.body.token)" }

Invoke-JsonApi -Name 'GET /v3/api-docs' -Method Get -Url "$baseUrl/v3/api-docs"
Invoke-WebRequest -UseBasicParsing -Method Get -Uri "$baseUrl/swagger-ui.html" | Out-Null
Add-Result -Name 'GET /swagger-ui.html' -Ok $true -StatusCode 200 -Detail "$baseUrl/swagger-ui.html"

$roleCatalog = Invoke-JsonApi -Name 'GET /api/users/roles/catalog' -Method Get -Url "$baseUrl/api/users/roles/catalog" -Headers $adminHeaders
$usersList = Invoke-JsonApi -Name 'GET /api/users' -Method Get -Url "$baseUrl/api/users" -Headers $adminHeaders

$category = Invoke-JsonApi -Name 'POST /api/categories' -Method Post -Url "$baseUrl/api/categories" -Headers $adminHeaders -Body @{
    name        = "Licores QA $suffix"
    description = 'Categoria QA'
}
$categoryId = $category.body.id
Invoke-JsonApi -Name 'GET /api/categories' -Method Get -Url "$baseUrl/api/categories" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/categories/{id}' -Method Get -Url "$baseUrl/api/categories/$categoryId" -Headers $adminHeaders
Invoke-JsonApi -Name 'PUT /api/categories/{id}' -Method Put -Url "$baseUrl/api/categories/$categoryId" -Headers $adminHeaders -Body @{
    name        = "Licores QA $suffix ACT"
    description = 'Categoria QA actualizada'
}

$unit = Invoke-JsonApi -Name 'POST /api/units' -Method Post -Url "$baseUrl/api/units" -Headers $adminHeaders -Body @{
    code     = "BOT$suffix"
    name     = "Botella QA $suffix"
    unitType = 'VOLUME'
}
$unitId = $unit.body.id
Invoke-JsonApi -Name 'GET /api/units' -Method Get -Url "$baseUrl/api/units" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/units/{id}' -Method Get -Url "$baseUrl/api/units/$unitId" -Headers $adminHeaders
Invoke-JsonApi -Name 'PUT /api/units/{id}' -Method Put -Url "$baseUrl/api/units/$unitId" -Headers $adminHeaders -Body @{
    code     = "BOT$suffix"
    name     = "Botella QA $suffix ACT"
    unitType = 'VOLUME'
}

$supplier = Invoke-JsonApi -Name 'POST /api/suppliers' -Method Post -Url "$baseUrl/api/suppliers" -Headers $adminHeaders -Body @{
    name    = "Proveedor QA $suffix"
    email   = "proveedor$suffix@qa.local"
    phone   = '3000000000'
    address = 'Calle QA 123'
}
$supplierId = $supplier.body.id
Invoke-JsonApi -Name 'GET /api/suppliers' -Method Get -Url "$baseUrl/api/suppliers" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/suppliers/{id}' -Method Get -Url "$baseUrl/api/suppliers/$supplierId" -Headers $adminHeaders
Invoke-JsonApi -Name 'PUT /api/suppliers/{id}' -Method Put -Url "$baseUrl/api/suppliers/$supplierId" -Headers $adminHeaders -Body @{
    name    = "Proveedor QA $suffix ACT"
    email   = "proveedor$suffix@qa.local"
    phone   = '3111111111'
    address = 'Calle QA 456'
}

$location = Invoke-JsonApi -Name 'POST /api/locations' -Method Post -Url "$baseUrl/api/locations" -Headers $adminHeaders -Body @{
    locationName = "Bodega QA $suffix"
    locationType = 'WAREHOUSE'
    description  = 'Ubicacion QA'
    active       = $true
}
$locationId = $location.body.id
Invoke-JsonApi -Name 'GET /api/locations' -Method Get -Url "$baseUrl/api/locations" -Headers $adminHeaders
$locationDetails = Invoke-JsonApi -Name 'GET /api/locations/{id}' -Method Get -Url "$baseUrl/api/locations/$locationId" -Headers $adminHeaders
Invoke-JsonApi -Name 'PUT /api/locations/{id}' -Method Put -Url "$baseUrl/api/locations/$locationId" -Headers $adminHeaders -Body @{
    id           = $locationId
    locationName = "Bodega QA $suffix ACT"
    locationType = 'WAREHOUSE'
    description  = 'Ubicacion QA actualizada'
    active       = $true
    createdAt    = $locationDetails.body.createdAt
    updatedAt    = $locationDetails.body.updatedAt
}

$product = Invoke-JsonApi -Name 'POST /api/products' -Method Post -Url "$baseUrl/api/products" -Headers $adminHeaders -Body @{
    sku             = "SKU-$suffix"
    name            = "Ron QA $suffix"
    categoryId      = $categoryId
    baseUnitId      = $unitId
    minStockBaseQty = 1
    barcode         = "BAR$suffix"
    active          = $true
    notes           = 'Producto QA'
}
$productId = $product.body.id
Invoke-JsonApi -Name 'GET /api/products' -Method Get -Url "$baseUrl/api/products" -Headers $adminHeaders
$productDetails = Invoke-JsonApi -Name 'GET /api/products/{id}' -Method Get -Url "$baseUrl/api/products/$productId" -Headers $adminHeaders
Invoke-JsonApi -Name 'PUT /api/products/{id}' -Method Put -Url "$baseUrl/api/products/$productId" -Headers $adminHeaders -Body @{
    id               = $productId
    sku             = "SKU-$suffix"
    name            = "Ron QA $suffix ACT"
    categoryId      = $categoryId
    baseUnitId      = $unitId
    minStockBaseQty = 2
    barcode         = "BAR$suffix"
    active          = $true
    notes           = 'Producto QA actualizado'
    createdAt       = $productDetails.body.createdAt
    updatedAt       = $productDetails.body.updatedAt
}

$recipe = Invoke-JsonApi -Name 'POST /api/recipes' -Method Post -Url "$baseUrl/api/recipes" -Headers $adminHeaders -Body @{
    recipeName  = "Receta QA $suffix"
    description = 'Receta QA'
    active      = $true
}
$recipeId = $recipe.body.id
Invoke-JsonApi -Name 'GET /api/recipes' -Method Get -Url "$baseUrl/api/recipes" -Headers $adminHeaders
$recipeDetails = Invoke-JsonApi -Name 'GET /api/recipes/{id}' -Method Get -Url "$baseUrl/api/recipes/$recipeId" -Headers $adminHeaders
Invoke-JsonApi -Name 'PUT /api/recipes/{id}' -Method Put -Url "$baseUrl/api/recipes/$recipeId" -Headers $adminHeaders -Body @{
    id          = $recipeId
    recipeName  = "Receta QA $suffix ACT"
    description = 'Receta QA actualizada'
    active      = $true
    createdAt   = $recipeDetails.body.createdAt
    updatedAt   = $recipeDetails.body.updatedAt
}
Invoke-JsonApi -Name 'GET /api/recipes/{id}/items (empty)' -Method Get -Url "$baseUrl/api/recipes/$recipeId/items" -Headers $adminHeaders
$recipeItem = Invoke-JsonApi -Name 'POST /api/recipes/{id}/items' -Method Post -Url "$baseUrl/api/recipes/$recipeId/items" -Headers $adminHeaders -Body @{
    recipeId  = $recipeId
    productId = $productId
    unitId    = $unitId
    quantity  = 1
}
Invoke-JsonApi -Name 'GET /api/recipes/{id}/items' -Method Get -Url "$baseUrl/api/recipes/$recipeId/items" -Headers $adminHeaders

$menu = Invoke-JsonApi -Name 'POST /api/menu-items' -Method Post -Url "$baseUrl/api/menu-items" -Headers $adminHeaders -Body @{
    menuName  = "Coctel QA $suffix"
    recipeId  = $recipeId
    salePrice = 25
    active    = $true
}
$menuId = $menu.body.id
Invoke-JsonApi -Name 'GET /api/menu-items' -Method Get -Url "$baseUrl/api/menu-items" -Headers $adminHeaders
$menuDetails = Invoke-JsonApi -Name 'GET /api/menu-items/{id}' -Method Get -Url "$baseUrl/api/menu-items/$menuId" -Headers $adminHeaders
Invoke-JsonApi -Name 'PUT /api/menu-items/{id}' -Method Put -Url "$baseUrl/api/menu-items/$menuId" -Headers $adminHeaders -Body @{
    id         = $menuId
    menuName  = "Coctel QA $suffix ACT"
    recipeId  = $recipeId
    salePrice = 30
    active    = $true
    createdAt = $menuDetails.body.createdAt
    updatedAt = $menuDetails.body.updatedAt
}

$user = Invoke-JsonApi -Name 'POST /api/users' -Method Post -Url "$baseUrl/api/users" -Headers $adminHeaders -Body @{
    username  = "cajero$suffix"
    fullName  = "Cajero QA $suffix"
    email     = "cajero$suffix@qa.local"
    password  = 'Temp1234'
    active    = $true
    roleNames = @('CAJERO')
}
$userId = $user.body.id
Invoke-JsonApi -Name 'GET /api/users/{id}' -Method Get -Url "$baseUrl/api/users/$userId" -Headers $adminHeaders
Invoke-JsonApi -Name 'PATCH /api/users/{id}/active false' -Method Patch -Url "$baseUrl/api/users/$userId/active?value=false" -Headers $adminHeaders
Invoke-JsonApi -Name 'PATCH /api/users/{id}/active true' -Method Patch -Url "$baseUrl/api/users/$userId/active?value=true" -Headers $adminHeaders
Invoke-JsonApi -Name 'PUT /api/users/{id}/roles' -Method Put -Url "$baseUrl/api/users/$userId/roles" -Headers $adminHeaders -Body @{
    roleNames = @('CAJERO', 'BARTENDER')
}
Invoke-JsonApi -Name 'PUT /api/users/{id}/password' -Method Put -Url "$baseUrl/api/users/$userId/password" -Headers $adminHeaders -Body @{
    temporaryPassword = 'Nueva1234'
}
$userLogin = Invoke-JsonApi -Name 'POST /api/auth/login (qa user)' -Method Post -Url "$baseUrl/api/auth/login" -Body @{
    username = "cajero$suffix"
    password = 'Nueva1234'
}
$userHeaders = @{ Authorization = "Bearer $($userLogin.body.token)" }

$shift = Invoke-JsonApi -Name 'POST /api/shifts' -Method Post -Url "$baseUrl/api/shifts" -Headers $adminHeaders -Body @{
    userId         = $userId
    locationId     = $locationId
    roleName       = 'CAJERO'
    scheduledStart = '2026-04-15T14:00:00Z'
    scheduledEnd   = '2026-04-15T22:00:00Z'
    notes          = 'Turno QA'
}
$shiftId = $shift.body.id
Invoke-JsonApi -Name 'GET /api/shifts' -Method Get -Url "$baseUrl/api/shifts" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/shifts/{id}' -Method Get -Url "$baseUrl/api/shifts/$shiftId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/shifts/me' -Method Get -Url "$baseUrl/api/shifts/me" -Headers $userHeaders
Invoke-JsonApi -Name 'PUT /api/shifts/{id}' -Method Put -Url "$baseUrl/api/shifts/$shiftId" -Headers $adminHeaders -Body @{
    userId         = $userId
    locationId     = $locationId
    roleName       = 'CAJERO'
    scheduledStart = '2026-04-15T15:00:00Z'
    scheduledEnd   = '2026-04-15T23:00:00Z'
    notes          = 'Turno QA actualizado'
}
$cancelShift = Invoke-JsonApi -Name 'POST /api/shifts (cancel target)' -Method Post -Url "$baseUrl/api/shifts" -Headers $adminHeaders -Body @{
    userId         = $userId
    locationId     = $locationId
    roleName       = 'CAJERO'
    scheduledStart = '2026-04-16T14:00:00Z'
    scheduledEnd   = '2026-04-16T22:00:00Z'
    notes          = 'Turno QA cancelar'
}
Invoke-JsonApi -Name 'PATCH /api/shifts/{id}/cancel' -Method Patch -Url "$baseUrl/api/shifts/$($cancelShift.body.id)/cancel" -Headers $adminHeaders

$transaction = Invoke-JsonApi -Name 'POST /api/transactions' -Method Post -Url "$baseUrl/api/transactions" -Headers $adminHeaders -Body @{
    transactionNumber = "TX-$suffix"
    transactionType   = 'PURCHASE'
    transactionDate   = '2026-04-15T18:00:00Z'
    targetLocationId  = $locationId
    supplierId        = $supplierId
    status            = 'DRAFT'
    createdBy         = 1
    referenceText     = 'Compra QA'
    reason            = 'Abastecimiento'
    items             = @(
        @{
            productId      = $productId
            unitId         = $unitId
            quantity       = 10
            unitCost       = 5
            notes          = 'Item QA'
        }
    )
}
$transactionId = $transaction.body.id
Invoke-JsonApi -Name 'GET /api/transactions' -Method Get -Url "$baseUrl/api/transactions" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/transactions/{id}' -Method Get -Url "$baseUrl/api/transactions/$transactionId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/transactions/{id}/items' -Method Get -Url "$baseUrl/api/transactions/$transactionId/items" -Headers $adminHeaders
Invoke-JsonApi -Name 'PATCH /api/transactions/{id}/status' -Method Patch -Url "$baseUrl/api/transactions/$transactionId/status?value=POSTED" -Headers $adminHeaders

$sale = Invoke-JsonApi -Name 'POST /api/sales' -Method Post -Url "$baseUrl/api/sales" -Headers $adminHeaders -Body @{
    saleNumber       = "SALE-$suffix"
    saleDatetime     = '2026-04-15T19:00:00Z'
    locationId       = $locationId
    cashierUserId    = $userId
    shiftId          = $shiftId
    totalAmount      = 30
    status           = 'PAID'
    processInventory = $false
    items            = @(
        @{
            menuItemId = $menuId
            quantity   = 1
            unitPrice  = 30
        }
    )
}
$saleId = $sale.body.id
Invoke-JsonApi -Name 'GET /api/sales' -Method Get -Url "$baseUrl/api/sales" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/sales/{id}' -Method Get -Url "$baseUrl/api/sales/$saleId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/sales/{id}/items' -Method Get -Url "$baseUrl/api/sales/$saleId/items" -Headers $adminHeaders
Invoke-JsonApi -Name 'POST /api/sales/{id}/post-inventory' -Method Post -Url "$baseUrl/api/sales/$saleId/post-inventory?userId=1" -Headers $adminHeaders

Invoke-JsonApi -Name 'POST /api/shifts/{id}/check-in' -Method Post -Url "$baseUrl/api/shifts/$shiftId/check-in" -Headers $userHeaders
Invoke-JsonApi -Name 'POST /api/shifts/{id}/check-out' -Method Post -Url "$baseUrl/api/shifts/$shiftId/check-out" -Headers $userHeaders

$physicalCount = Invoke-JsonApi -Name 'POST /api/physical-counts' -Method Post -Url "$baseUrl/api/physical-counts" -Headers $adminHeaders -Body @{
    countNumber = "CNT-$suffix"
    locationId  = $locationId
    countDate   = '2026-04-15T20:00:00Z'
    notes       = 'Conteo QA'
    createdBy   = 1
    items       = @(
        @{
            productId          = $productId
            theoreticalQtyBase = 9
            actualQtyBase      = 9
            notes              = 'Conteo QA item'
        }
    )
}
$physicalCountId = $physicalCount.body.id
Invoke-JsonApi -Name 'GET /api/physical-counts' -Method Get -Url "$baseUrl/api/physical-counts" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/physical-counts/{id}' -Method Get -Url "$baseUrl/api/physical-counts/$physicalCountId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/physical-counts/{id}/items' -Method Get -Url "$baseUrl/api/physical-counts/$physicalCountId/items" -Headers $adminHeaders
Invoke-JsonApi -Name 'POST /api/physical-counts/{id}/close' -Method Post -Url "$baseUrl/api/physical-counts/$physicalCountId/close?userId=1" -Headers $adminHeaders

Invoke-JsonApi -Name 'GET /api/stock-balances' -Method Get -Url "$baseUrl/api/stock-balances" -Headers $adminHeaders
$stockBalanceList = Invoke-JsonApi -Name 'GET /api/reports/stock' -Method Get -Url "$baseUrl/api/reports/stock?locationId=$locationId" -Headers $adminHeaders
if ($stockBalanceList.body -and $stockBalanceList.body.Count -gt 0) {
    $stockBalanceId = $stockBalanceList.body[0].stockBalanceId
    if ($stockBalanceId) {
        Invoke-JsonApi -Name 'GET /api/stock-balances/{id}' -Method Get -Url "$baseUrl/api/stock-balances/$stockBalanceId" -Headers $adminHeaders
    }
}

Invoke-JsonApi -Name 'GET /api/reports/dashboard/daily' -Method Get -Url "$baseUrl/api/reports/dashboard/daily?date=2026-04-15&locationId=$locationId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/reports/movements' -Method Get -Url "$baseUrl/api/reports/movements?from=2026-04-14&to=2026-04-16&locationId=$locationId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/reports/waste' -Method Get -Url "$baseUrl/api/reports/waste?from=2026-04-14&to=2026-04-16&locationId=$locationId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/reports/consumption' -Method Get -Url "$baseUrl/api/reports/consumption?from=2026-04-14&to=2026-04-16&locationId=$locationId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/reports/count-differences' -Method Get -Url "$baseUrl/api/reports/count-differences?physicalCountId=$physicalCountId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/reports/inventory-valuation' -Method Get -Url "$baseUrl/api/reports/inventory-valuation?locationId=$locationId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/reports/audit' -Method Get -Url "$baseUrl/api/reports/audit?from=2026-04-14&to=2026-04-16" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/reports/shifts' -Method Get -Url "$baseUrl/api/reports/shifts?from=2026-04-14&to=2026-04-16&locationId=$locationId&userId=$userId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/reports/shifts/by-user' -Method Get -Url "$baseUrl/api/reports/shifts/by-user?from=2026-04-14&to=2026-04-16&locationId=$locationId" -Headers $adminHeaders
Invoke-JsonApi -Name 'GET /api/reports/shifts/by-location' -Method Get -Url "$baseUrl/api/reports/shifts/by-location?from=2026-04-14&to=2026-04-16&userId=$userId" -Headers $adminHeaders

$tmpDir = Join-Path $PSScriptRoot 'tmp-smoke'
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
Invoke-FileApi -Name 'GET /api/reports/stock/export.xlsx' -Url "$baseUrl/api/reports/stock/export.xlsx?locationId=$locationId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'stock.xlsx')
Invoke-FileApi -Name 'GET /api/reports/movements/export.xlsx' -Url "$baseUrl/api/reports/movements/export.xlsx?from=2026-04-14&to=2026-04-16&locationId=$locationId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'movements.xlsx')
Invoke-FileApi -Name 'GET /api/reports/waste/export.xlsx' -Url "$baseUrl/api/reports/waste/export.xlsx?from=2026-04-14&to=2026-04-16&locationId=$locationId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'waste.xlsx')
Invoke-FileApi -Name 'GET /api/reports/consumption/export.xlsx' -Url "$baseUrl/api/reports/consumption/export.xlsx?from=2026-04-14&to=2026-04-16&locationId=$locationId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'consumption.xlsx')
Invoke-FileApi -Name 'GET /api/reports/count-differences/export.xlsx' -Url "$baseUrl/api/reports/count-differences/export.xlsx?physicalCountId=$physicalCountId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'count-differences.xlsx')
Invoke-FileApi -Name 'GET /api/reports/inventory-valuation/export.xlsx' -Url "$baseUrl/api/reports/inventory-valuation/export.xlsx?locationId=$locationId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'inventory-valuation.xlsx')
Invoke-FileApi -Name 'GET /api/reports/audit/export.xlsx' -Url "$baseUrl/api/reports/audit/export.xlsx?from=2026-04-14&to=2026-04-16" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'audit.xlsx')
Invoke-FileApi -Name 'GET /api/reports/shifts/export (csv)' -Url "$baseUrl/api/reports/shifts/export?from=2026-04-14&to=2026-04-16&locationId=$locationId&userId=$userId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'shifts.csv')
Invoke-FileApi -Name 'GET /api/reports/shifts/by-user/export (csv)' -Url "$baseUrl/api/reports/shifts/by-user/export?from=2026-04-14&to=2026-04-16&locationId=$locationId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'shifts-by-user.csv')
Invoke-FileApi -Name 'GET /api/reports/shifts/by-location/export (csv)' -Url "$baseUrl/api/reports/shifts/by-location/export?from=2026-04-14&to=2026-04-16&userId=$userId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'shifts-by-location.csv')
Invoke-FileApi -Name 'GET /api/reports/shifts/export.xlsx' -Url "$baseUrl/api/reports/shifts/export.xlsx?from=2026-04-14&to=2026-04-16&locationId=$locationId&userId=$userId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'shifts.xlsx')
Invoke-FileApi -Name 'GET /api/reports/shifts/by-user/export.xlsx' -Url "$baseUrl/api/reports/shifts/by-user/export.xlsx?from=2026-04-14&to=2026-04-16&locationId=$locationId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'shifts-by-user.xlsx')
Invoke-FileApi -Name 'GET /api/reports/shifts/by-location/export.xlsx' -Url "$baseUrl/api/reports/shifts/by-location/export.xlsx?from=2026-04-14&to=2026-04-16&userId=$userId" -Headers $adminHeaders -OutFile (Join-Path $tmpDir 'shifts-by-location.xlsx')

$deleteCategory = Invoke-JsonApi -Name 'POST /api/categories (delete target)' -Method Post -Url "$baseUrl/api/categories" -Headers $adminHeaders -Body @{
    name        = "Delete Cat $suffix"
    description = 'Delete target'
}
Invoke-DeleteApi -Name 'DELETE /api/categories/{id}' -Url "$baseUrl/api/categories/$($deleteCategory.body.id)" -Headers $adminHeaders

$deleteUnit = Invoke-JsonApi -Name 'POST /api/units (delete target)' -Method Post -Url "$baseUrl/api/units" -Headers $adminHeaders -Body @{
    code     = "DEL$suffix"
    name     = "Delete Unit $suffix"
    unitType = 'VOLUME'
}
$deleteSupplier = Invoke-JsonApi -Name 'POST /api/suppliers (delete target)' -Method Post -Url "$baseUrl/api/suppliers" -Headers $adminHeaders -Body @{
    name = "Delete Supplier $suffix"
}
$deleteLocation = Invoke-JsonApi -Name 'POST /api/locations (delete target)' -Method Post -Url "$baseUrl/api/locations" -Headers $adminHeaders -Body @{
    locationName = "Delete Location $suffix"
    locationType = 'WAREHOUSE'
    active       = $true
}
$deleteRecipe = Invoke-JsonApi -Name 'POST /api/recipes (delete target)' -Method Post -Url "$baseUrl/api/recipes" -Headers $adminHeaders -Body @{
    recipeName = "Delete Recipe $suffix"
    active     = $true
}
$deleteCategoryForProduct = Invoke-JsonApi -Name 'POST /api/categories (delete product target)' -Method Post -Url "$baseUrl/api/categories" -Headers $adminHeaders -Body @{
    name = "Delete Product Cat $suffix"
}
$deleteUnitForProduct = Invoke-JsonApi -Name 'POST /api/units (delete product target)' -Method Post -Url "$baseUrl/api/units" -Headers $adminHeaders -Body @{
    code     = "DP$suffix"
    name     = "Delete Product Unit $suffix"
    unitType = 'VOLUME'
}
$deleteProduct = Invoke-JsonApi -Name 'POST /api/products (delete target)' -Method Post -Url "$baseUrl/api/products" -Headers $adminHeaders -Body @{
    sku             = "DELPROD-$suffix"
    name            = "Delete Product $suffix"
    categoryId      = $deleteCategoryForProduct.body.id
    baseUnitId      = $deleteUnitForProduct.body.id
    minStockBaseQty = 0
    active          = $true
}
$deleteRecipeItem = Invoke-JsonApi -Name 'POST /api/recipes/{id}/items (delete target)' -Method Post -Url "$baseUrl/api/recipes/$($deleteRecipe.body.id)/items" -Headers $adminHeaders -Body @{
    recipeId  = $deleteRecipe.body.id
    productId = $deleteProduct.body.id
    unitId    = $deleteUnitForProduct.body.id
    quantity  = 1
}
$deleteMenu = Invoke-JsonApi -Name 'POST /api/menu-items (delete target)' -Method Post -Url "$baseUrl/api/menu-items" -Headers $adminHeaders -Body @{
    menuName  = "Delete Menu $suffix"
    recipeId  = $deleteRecipe.body.id
    salePrice = 10
    active    = $true
}
Invoke-DeleteApi -Name 'DELETE /api/menu-items/{id}' -Url "$baseUrl/api/menu-items/$($deleteMenu.body.id)" -Headers $adminHeaders
Invoke-DeleteApi -Name 'DELETE /api/recipes/items/{itemId}' -Url "$baseUrl/api/recipes/items/$($deleteRecipeItem.body.id)" -Headers $adminHeaders
Invoke-DeleteApi -Name 'DELETE /api/recipes/{id}' -Url "$baseUrl/api/recipes/$($deleteRecipe.body.id)" -Headers $adminHeaders
Invoke-DeleteApi -Name 'DELETE /api/products/{id}' -Url "$baseUrl/api/products/$($deleteProduct.body.id)" -Headers $adminHeaders
Invoke-DeleteApi -Name 'DELETE /api/locations/{id}' -Url "$baseUrl/api/locations/$($deleteLocation.body.id)" -Headers $adminHeaders
Invoke-DeleteApi -Name 'DELETE /api/suppliers/{id}' -Url "$baseUrl/api/suppliers/$($deleteSupplier.body.id)" -Headers $adminHeaders
Invoke-DeleteApi -Name 'DELETE /api/units/{id}' -Url "$baseUrl/api/units/$($deleteUnit.body.id)" -Headers $adminHeaders
Invoke-DeleteApi -Name 'DELETE /api/units/{id} (product target)' -Url "$baseUrl/api/units/$($deleteUnitForProduct.body.id)" -Headers $adminHeaders
Invoke-DeleteApi -Name 'DELETE /api/categories/{id} (product target)' -Url "$baseUrl/api/categories/$($deleteCategoryForProduct.body.id)" -Headers $adminHeaders

$summary = [PSCustomObject]@{
    okCount     = ($results | Where-Object { $_.ok }).Count
    failedCount = ($results | Where-Object { -not $_.ok }).Count
    results     = $results
}

$summary | ConvertTo-Json -Depth 6
