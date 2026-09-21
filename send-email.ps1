param (
    [string]$To = "hervewognin264@gmail.com",
    [string]$Subject = "Test ContentDock SMTP",
    [string]$Body = "Test de l'envoi d'email SMTP ContentDock",
    [string]$PayloadFile = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if ($PayloadFile -and (Test-Path $PayloadFile)) {
    try {
        $rawJson = Get-Content -Path $PayloadFile -Raw -Encoding UTF8
        $data = $rawJson | ConvertFrom-Json
        if ($data.to) { $To = $data.to }
        if ($data.subject) { $Subject = $data.subject }
        if ($data.html) { $Body = $data.html }
    } catch {
        Write-Warning "Erreur lors de la lecture du fichier payload : $($_.Exception.Message)"
    }
}

try {
    $secpasswd = ConvertTo-SecureString "wcjiqnynmbiplkgx" -AsPlainText -Force
    $creds = New-Object System.Management.Automation.PSCredential ("hervewognin264@gmail.com", $secpasswd)
    
    Send-MailMessage -From "hervewognin264@gmail.com" `
                     -To $To `
                     -Subject $Subject `
                     -Body $Body `
                     -BodyAsHtml `
                     -Encoding ([System.Text.Encoding]::UTF8) `
                     -SmtpServer "smtp.gmail.com" `
                     -Port 587 `
                     -UseSsl `
                     -Credential $creds `
                     -ErrorAction Stop

    Write-Output "SUCCESS: Email sent to $To"
} catch {
    Write-Error "ERROR: $($_.Exception.Message)"
}
