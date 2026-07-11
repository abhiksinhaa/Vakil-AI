export function isProfileComplete(profile: any) {
  if (!profile) return false;
  return (
    !!(profile.full_name?.trim() || profile.advocate_name?.trim()) && // Use advocate_name as fallback for Display Name based on form logic
    !!profile.state?.trim() &&
    !!profile.city?.trim() &&
    !!profile.email?.trim() &&
    !!profile.whatsapp_number?.trim()
  );
}
