# Offline provider mocks: terraform test never contacts OCI or provisions here.
mock_provider "oci" {}
variables {
  region                = "ap-mumbai-1"
  compartment_ocid      = "ocid1.compartment.test"
  availability_domain   = "test-AD-1"
  ubuntu_arm_image_ocid = "ocid1.image.test"
  ssh_public_key        = "ssh-ed25519 TEST_PUBLIC_KEY"
  admin_cidr            = "203.0.113.10/32"
  free_tier_confirmed   = true
}
run "only_arm_within_conservative_budget_and_ssh_ingress" {
  command = plan
  assert {
    condition     = oci_core_instance.gradeflow.shape == "VM.Standard.A1.Flex" && oci_core_instance.gradeflow.shape_config[0].ocpus <= 2 && oci_core_instance.gradeflow.shape_config[0].memory_in_gbs <= 12
    error_message = "Unexpected shape or capacity beyond conservative A1 allowance."
  }
  assert {
    condition     = tonumber(oci_core_instance.gradeflow.source_details[0].boot_volume_size_in_gbs) == 50
    error_message = "Boot storage increased: recheck tenancy budget."
  }
  assert {
    condition = length(oci_core_security_list.gradeflow.ingress_security_rules) == 1 && alltrue([
      for rule in oci_core_security_list.gradeflow.ingress_security_rules : rule.source == var.admin_cidr && rule.protocol == "6" && rule.tcp_options[0].min == 22 && rule.tcp_options[0].max == 22
    ])
    error_message = "Only SSH from the operator /32 may be reachable."
  }
}
run "requires_explicit_free_tier_confirmation" {
  command = plan
  variables { free_tier_confirmed = false }
  expect_failures = [oci_core_vcn.gradeflow]
}
run "rejects_worldwide_admin_access" {
  command = plan
  variables { admin_cidr = "0.0.0.0/0" }
  expect_failures = [var.admin_cidr]
}
