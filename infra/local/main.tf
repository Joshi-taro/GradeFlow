terraform {
  required_version = ">= 1.7, < 2.0"
  backend "local" {}
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.6.2"
    }
  }
}

# Uses the local Unix socket by default. Never expose a TCP Docker daemon.
provider "docker" {}

resource "docker_network" "jenkins" {
  name = "gradeflow-jenkins"
}

resource "docker_volume" "jenkins_home" {
  name = "gradeflow-jenkins-home"
  lifecycle {
    prevent_destroy = true
  }
}

resource "docker_image" "jenkins" {
  name         = "jenkins/jenkins:lts-jdk21@sha256:a660310e39ade10631f774bacd5219de767dfd08947ea5c32a739b5e5bb382c1"
  keep_locally = true
}

resource "docker_container" "jenkins" {
  name    = "gradeflow-jenkins"
  image   = docker_image.jenkins.image_id
  restart = "unless-stopped"
  ports {
    internal = 8080
    external = 8081
    ip       = "127.0.0.1"
  }
  volumes {
    volume_name    = docker_volume.jenkins_home.name
    container_path = "/var/jenkins_home"
  }
  networks_advanced {
    name = docker_network.jenkins.name
  }
  # Controller has no Docker socket and no published agent port.
}

output "jenkins_url" {
  value = "http://127.0.0.1:8081"
}
