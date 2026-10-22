variable "region" { type = string }
variable "compartment_ocid" { type = string }
variable "availability_domain" { type = string }
variable "ubuntu_arm_image_ocid" {
  type        = string
  description = "A reviewed Canonical Ubuntu 24.04 aarch64 platform image in your home region. No Marketplace image."
}
variable "ssh_public_key" {
  type = string
  validation {
    condition     = can(regex("^ssh-(ed25519|rsa) ", var.ssh_public_key))
    error_message = "Supply an OpenSSH public key; never supply the private key."
  }
}
variable "admin_cidr" {
  type        = string
  description = "Your current public IPv4 /32; Jenkins SSH must originate here too, or use the same private operator host."
  validation {
    condition     = can(cidrnetmask(var.admin_cidr)) && can(regex("/32$", var.admin_cidr)) && var.admin_cidr != "0.0.0.0/32"
    error_message = "Require one operator IPv4 /32, not a public catch-all range."
  }
}
variable "free_tier_confirmed" {
  type        = bool
  default     = false
  description = "Set true ONLY after explicit approval, verifying home region, Always Free eligibility, total tenancy usage and 50GB storage allowance. Not a cost guarantee."
}
