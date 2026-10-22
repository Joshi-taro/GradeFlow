terraform {
  required_version = ">= 1.7.0, < 2.0.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 7.0"
    }
  }
  # Local state is intentional for a single operator/serialized Jenkins job.
  # Use an absolute persistent, encrypted path with -backend-config=path=... .
  backend "local" {}
}
provider "oci" {
  region = var.region
  # OCI_TENANCY_OCID, OCI_USER_OCID, OCI_FINGERPRINT, OCI_PRIVATE_KEY_PATH
  # are supplied outside Git; alternatively use ~/.oci/config.
}
