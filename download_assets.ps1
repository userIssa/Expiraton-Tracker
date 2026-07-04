# Create references directory
New-Item -ItemType Directory -Force -Path "stitch_reference"

# Design System MD Guidelines
$designSystemMd = @"
---
name: Vigilant Inventory
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5b403c'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#8f706b'
  outline-variant: '#e4beb8'
  surface-tint: '#b82014'
  primary: '#6e0000'
  on-primary: '#ffffff'
  primary-container: '#990000'
  on-primary-container: '#ffa092'
  inverse-primary: '#ffb4a8'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#333333'
  on-tertiary: '#ffffff'
  tertiary-container: '#4a4949'
  on-tertiary-container: '#bab8b8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#930000'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  table-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1440px
---

## Brand & Style

The design system is engineered for high-stakes inventory management where clarity and urgency are paramount. Drawing inspiration from high-productivity tools like Linear, it adopts a **Modern Minimalist** aesthetic with a **High-Contrast Dashboard** orientation. 

The visual narrative focuses on "information at a glance." By utilizing a disciplined white-space strategy and a restrained but authoritative color palette, the UI ensures that critical expiration data is never obscured by decorative elements. The style is utilitarian yet premium, utilizing subtle borders and precise alignment to create a sense of professional reliability.

**Key Principles:**
- **Density with Clarity:** Maximum data visibility without cognitive overload.
- **Urgency Hierarchy:** Brand colors provide structure, while functional colors provide meaning.
- **Precision:** Sharp execution of lines and typography to mirror the accuracy required in inventory tracking.
"@

Set-Content -Path "stitch_reference/design_system.md" -Value $designSystemMd

# Downloads Helper function
function Download-Asset($url, $outputPath) {
    Write-Host "Downloading $outputPath..."
    curl.exe -L -o $outputPath $url
}

# Screen 2: Analytics Dashboard (Manager)
Download-Asset "https://lh3.googleusercontent.com/aida/AP1WRLu2yynmMnd-2bmv6fYAbz3KmaRX8ADBkfhshw747StMStP_3r5_8Sj3kXxx2THNc1pB0p7VRy70ZgYpR6AiBcFMGLWmiWYbb-ELEarJRBtCjcDKRPWvbNamobkLXAVB-ad3rU8PXhGaNGBwn1-DOu6AHoFmBJa4VKmjRg6qqKzjeNPY7CCysfrLfSVScV8seKgUstEvXjsCazJmIwwZP_UcYxq2iE_lW0ldvUqzETem4DvtCnwAOHyL0w" "stitch_reference/screen2_analytics_dashboard.png"
Download-Asset "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2RhZTRkMjI3MWQ5NDRlYmZiZDUxMzExMzk1NDQ2MjFlEgsSBxD595SGlQEYAZIBIwoKcHJvamVjdF9pZBIVQhMyODc1NTIyMDE3NDQ4MTY3NzUz&filename=&opi=89354086" "stitch_reference/screen2_analytics_dashboard.html"

# Screen 3: Item Detail & Actions
Download-Asset "https://lh3.googleusercontent.com/aida/AP1WRLsUjJIlwLbcEOqBcr-xFJShe9mBCCOYezGAjkUAvPEfLBIbvUu78cewe9VhdiVwpsVwm6ZY_jv_koUIUwH-bQQBkOIoPbWPo7_Qy1edIDnR1Zj9GwHSA3DR6Whub7LjX0NlvWB843CRYzYMYQBPI_Se2_DWhwi-j1pahpAgipFIi1akvfuLFs9t5_zhLr0XfuVFgK66zcaF4yw-0xEi_uprxb5Z1P-AcJZXmxm7XLL6k60Gih0CzntplQ" "stitch_reference/screen3_item_detail_actions.png"
Download-Asset "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzZlNTY5MmVhNThlNzRhNjM4ZDI0ZDMwODAxNWY1MWQ0EgsSBxD595SGlQEYAZIBIwoKcHJvamVjdF9pZBIVQhMyODc1NTIyMDE3NDQ4MTY3NzUz&filename=&opi=89354086" "stitch_reference/screen3_item_detail_actions.html"

# Screen 4: Register New Product
Download-Asset "https://lh3.googleusercontent.com/aida/AP1WRLuFns-KRaIq6PIKeBYC_uXy1qpPqFNyJQkp5HiVNCat93kWZe3qYPOfHA9FObk2-k5WU5rIzPGAwyeYzsQYTEZS326YktY4vK-LhNo9DeT69AAzV6I4dd831GRt9GKowy4lpQDB-WxvRtZz3fUvAyiOIU_lwUyEeAi8N9yJQjrEw3-k_wjdfs0bWtJi81J_eTOd_PZrdcJvymG1RxnjIEoR_H3Abss4zysSJnRG4_nshUASciWPnfbXk_Y" "stitch_reference/screen4_register_new_product.png"
Download-Asset "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2ZmYjk2NjkwZmFjZDRmMzU5YWQ0NWY3YzNmM2FlOWRkEgsSBxD595SGlQEYAZIBIwoKcHJvamVjdF9pZBIVQhMyODc1NTIyMDE3NDQ4MTY3NzUz&filename=&opi=89354086" "stitch_reference/screen4_register_new_product.html"

# Screen 5: Inventory List (Store-hand)
Download-Asset "https://lh3.googleusercontent.com/aida/AP1WRLuHdnCz4QPM1sNELI07bzMtXv5-hrIOYqQn00cacfnudbFTVk06hl0cXvrOc0fQnkxMyFtfzZ35q2kxJ0p22KxQBPR4o_zphXrA2UKeYDUIyU-1oAq7q2FVmtX3ZWRle0G4PrvOaYOEKr_sNzp7Mmtt3Sww72Km97zgmilhbNklV37bQJ_oh-lbLJJI2OndU42fc6zC5wRLGzsaX7I0aWIz6KAiDseD7v78wTWJ2rjk7qZseZy0ELzmztc" "stitch_reference/screen5_inventory_list.png"
Download-Asset "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzdlZGY5ZjQ3OWFjNjRlMDQ4MWZkMjU0NjY0NDA3YjdjEgsSBxD595SGlQEYAZIBIwoKcHJvamVjdF9pZBIVQhMyODc1NTIyMDE3NDQ4MTY3NzUz&filename=&opi=89354086" "stitch_reference/screen5_inventory_list.html"

# Screen 6: Escalation Queue
Download-Asset "https://lh3.googleusercontent.com/aida/AP1WRLtUqoVYAWjiQBayPUY8P2MmvOI_VJoZJcWePf_TkStzSwwS9LkKQp44srJj0DXuRSqkr2lY5RFF0P7fPx2ou7PCyl2J8Zy8H47ojW1_8xg9iCnkjrSJfCpmHFgoHdMDCWz--QsmCnT0EeqUodJTshV2LRbVLUmeJ5VvbW_iCWUV7BnNRBYcxvmAJNB2BFzUWc5H_zLPLpXHEj7c5XARcbFtsp-myh2HOAHeDtV8aqB9H2p4kUa4PZ7rhUs" "stitch_reference/screen6_escalation_queue.png"
Download-Asset "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzUyM2JhNTE3OWVhOTRiNjliZGRlOWEzYjczZGVmYzI0EgsSBxD595SGlQEYAZIBIwoKcHJvamVjdF9pZBIVQhMyODc1NTIyMDE3NDQ4MTY3NzUz&filename=&opi=89354086" "stitch_reference/screen6_escalation_queue.html"

Write-Host "Downloads completed!"
