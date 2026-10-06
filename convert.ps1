Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("i:\InstaReels\public\PWA_ICON.jpg")
$img.Save("i:\InstaReels\public\PWA_ICON.png", [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()

$img2 = [System.Drawing.Image]::FromFile("i:\InstaReels\public\logo.jpg")
$img2.Save("i:\InstaReels\public\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$img2.Dispose()
