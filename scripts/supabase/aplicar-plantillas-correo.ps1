# Sube a Supabase Auth las plantillas de correo de supabase/templates/ (registro y
# recuperación de contraseña), con sus asuntos. Usa el token que guarda
# `npx supabase login` en el Administrador de credenciales de Windows; no lo imprime.
# Solo cambia esos cuatro campos de la configuración de Auth.
#
#   powershell -ExecutionPolicy Bypass -File scripts/supabase/aplicar-plantillas-correo.ps1
#
param([string]$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")))
$ErrorActionPreference = "Stop"

# Lee el token que guardó el CLI de Supabase en el Administrador de credenciales (no se imprime).
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class Cred {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr cred);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr cred);
  public static string Leer(string target) {
    IntPtr p;
    if (!CredRead(target, 1, 0, out p)) return null;
    var c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL));
    var bytes = new byte[c.CredentialBlobSize];
    Marshal.Copy(c.CredentialBlob, bytes, 0, c.CredentialBlobSize);
    CredFree(p);
    return System.Text.Encoding.UTF8.GetString(bytes);
  }
}
"@
$token = [Cred]::Leer("Supabase CLI:supabase")
if (-not $token) { throw "No se encontró el token del CLI" }
if ($token.StartsWith("go-keyring-base64:")) {
  $token = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($token.Substring(18)))
}

# ReadAllText y no Get-Content: en PowerShell 5.1 Get-Content le pega propiedades
# (PSPath...) al texto y ConvertTo-Json lo manda como objeto en vez de string.
$confirmacion = [System.IO.File]::ReadAllText((Join-Path $Repo "supabase\templates\confirmar-registro.html"), [System.Text.Encoding]::UTF8)
$recuperacion = [System.IO.File]::ReadAllText((Join-Path $Repo "supabase\templates\recuperar-contrasena.html"), [System.Text.Encoding]::UTF8)

$cuerpo = @{
  mailer_subjects_confirmation          = "Tu código para entrar a Mikhuna 🥔"
  mailer_templates_confirmation_content = $confirmacion
  mailer_subjects_recovery              = "Tu código para cambiar la contraseña 🔑"
  mailer_templates_recovery_content     = $recuperacion
} | ConvertTo-Json -Depth 3

$url = "https://api.supabase.com/v1/projects/lvkweyiwzkqtojlylinc/config/auth"
$headers = @{ Authorization = "Bearer $token" }

# Supabase no deja cambiar plantillas sin SMTP propio: se revisa antes para dar un
# mensaje claro (nunca se muestra la contraseña del SMTP).
$actual = Invoke-RestMethod -Method Get -Uri $url -Headers $headers
"SMTP host:      " + $(if ($actual.smtp_host) { $actual.smtp_host } else { "(vacío)" })
"SMTP puerto:    " + $(if ($actual.smtp_port) { $actual.smtp_port } else { "(vacío)" })
"SMTP usuario:   " + $(if ($actual.smtp_user) { $actual.smtp_user } else { "(vacío)" })
"Remitente:      " + $(if ($actual.smtp_admin_email) { $actual.smtp_admin_email } else { "(vacío)" })
"Contraseña:     " + $(if ($actual.smtp_pass) { "configurada" } else { "(vacía)" })
if (-not $actual.smtp_host -or -not $actual.smtp_admin_email) {
  "El proyecto mikhuna (lvkweyiwzkqtojlylinc) no tiene SMTP propio guardado."
  "Configúralo en Authentication -> Emails -> SMTP Settings de ESE proyecto y vuelve a correr el script."
  exit 1
}
$bytes = [System.Text.Encoding]::UTF8.GetBytes($cuerpo)
$r = Invoke-RestMethod -Method Patch -Uri $url -Headers $headers -ContentType "application/json; charset=utf-8" -Body $bytes

# Comprobación: solo se muestran asuntos y si el contenido trae el código.
"asunto confirmación: " + $r.mailer_subjects_confirmation
"asunto recuperación: " + $r.mailer_subjects_recovery
"confirmación con {{ .Token }}: " + $r.mailer_templates_confirmation_content.Contains("{{ .Token }}")
"recuperación con {{ .Token }}: " + $r.mailer_templates_recovery_content.Contains("{{ .Token }}")
"largo del código (otp_length): " + $r.mailer_otp_length
"vence en (s): " + $r.mailer_otp_exp
