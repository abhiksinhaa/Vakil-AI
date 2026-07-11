export function isProfileComplete(profile: any) {
  return (
    !!profile?.full_name?.trim() &&
    !!profile?.display_name?.trim() &&
    !!profile?.state?.trim() &&
    !!profile?.city?.trim() &&
    !!profile?.email?.trim() &&
    !!profile?.whatsapp_number?.trim() &&
    profile?.whatsapp_verified === true
  )
}
