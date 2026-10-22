mock_provider "docker" {}

run "private_controller" {
  command = plan
  assert {
    condition     = one(docker_container.jenkins.ports).ip == "127.0.0.1" && one(docker_container.jenkins.ports).external == 8081
    error_message = "Jenkins must bind only to loopback."
  }
  assert {
    condition     = length(docker_container.jenkins.volumes) == 1 && one(docker_container.jenkins.volumes).container_path == "/var/jenkins_home"
    error_message = "Only Jenkins home may be mounted; never mount the Docker socket."
  }
}
