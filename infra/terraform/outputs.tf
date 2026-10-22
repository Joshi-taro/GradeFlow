output "public_ip" { value = oci_core_instance.gradeflow.public_ip }
output "private_ip" { value = oci_core_instance.gradeflow.private_ip }
output "ssh_user" { value = "ubuntu" }
