export interface EndpointAdvisory {
  title: string;
  message: string;
  suggestedAlternative?: {
    path: string;
    method: string;
    reason: string;
  };
}

function isIntuneConfigurationPolicySettingsPath(path: string): boolean {
  const normalized = path.toLowerCase().replace(/\/$/, "");
  return (
    normalized ===
      "/devicemanagement/configurationpolicies/{devicemanagementconfigurationpolicy-id}/settings/{devicemanagementconfigurationsetting-id}" ||
    normalized ===
      "/devicemanagement/configurationpolicies/{devicemanagementconfigurationpolicy-id}/settings"
  );
}

export function getEndpointAdvisories(
  path: string,
  method: string
): EndpointAdvisory[] {
  const advisories: EndpointAdvisory[] = [];
  const methodUpper = method.toUpperCase();

  if (
    methodUpper === "PATCH" &&
    isIntuneConfigurationPolicySettingsPath(path)
  ) {
    advisories.push({
      title: "Intune DeviceConfigV2 routing caveat",
      message:
        "Some tenants reject PATCH on nested configurationPolicies/{id}/settings/{settingId} routes even when metadata lists the endpoint. If you receive a route-mismatch error, update the parent policy instead.",
      suggestedAlternative: {
        method: "PUT",
        path: "/deviceManagement/configurationPolicies('{deviceManagementConfigurationPolicy-id}')",
        reason:
          "This is the route commonly used by the Intune portal to update DeviceConfigV2 policies with embedded settings.",
      },
    });
  }

  return advisories;
}
