resource "oci_core_vcn" "gradeflow" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.20.0.0/16"]
  display_name   = "gradeflow"
  dns_label      = "gradeflow"
  lifecycle {
    precondition {
      condition     = var.free_tier_confirmed
      error_message = "Stop: obtain explicit provisioning approval and confirm current free eligibility and remaining allowance."
    }
  }
}
resource "oci_core_internet_gateway" "gradeflow" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.gradeflow.id
  display_name   = "gradeflow-egress"
  enabled        = true
}
resource "oci_core_route_table" "gradeflow" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.gradeflow.id
  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.gradeflow.id
  }
}
resource "oci_core_security_list" "gradeflow" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.gradeflow.id
  display_name   = "gradeflow-ssh-only"
  ingress_security_rules {
    protocol = "6"
    source   = var.admin_cidr
    tcp_options {
      min = 22
      max = 22
    }
  }
  # Outbound package/image downloads and DNS; stateful replies are allowed.
  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }
}
resource "oci_core_subnet" "gradeflow" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.gradeflow.id
  cidr_block                 = "10.20.1.0/24"
  display_name               = "gradeflow"
  dns_label                  = "node"
  route_table_id             = oci_core_route_table.gradeflow.id
  security_list_ids          = [oci_core_security_list.gradeflow.id]
  prohibit_public_ip_on_vnic = false
}
resource "oci_core_instance" "gradeflow" {
  compartment_id      = var.compartment_ocid
  availability_domain = var.availability_domain
  display_name        = "gradeflow-k3s"
  shape               = "VM.Standard.A1.Flex"
  shape_config {
    ocpus         = 2
    memory_in_gbs = 6
  }
  source_details {
    source_type             = "image"
    source_id               = var.ubuntu_arm_image_ocid
    boot_volume_size_in_gbs = 50
    boot_volume_vpus_per_gb = 10
  }
  create_vnic_details {
    subnet_id        = oci_core_subnet.gradeflow.id
    assign_public_ip = true
    hostname_label   = "k3s"
  }
  metadata = { ssh_authorized_keys = var.ssh_public_key }
  instance_options { are_legacy_imds_endpoints_disabled = true }
  agent_config {
    is_management_disabled = true
    is_monitoring_disabled = true
  }
  lifecycle { prevent_destroy = true }
}
