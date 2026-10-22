pipeline {
    // Configure these labels on separate, single-executor Linux agents. PR jobs
    // must never share a user, workspace, Docker daemon or credentials with main.
    agent { label "${env.BRANCH_NAME == 'main' && !env.CHANGE_ID ? 'gradeflow-trusted' : 'gradeflow-untrusted'}" }
    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }
    parameters {
        booleanParam(name: 'PUBLISH_IMAGE', defaultValue: false, description: 'Main only: push commit-tagged amd64/arm64 image to GHCR (review package visibility first).')
        booleanParam(name: 'PROVISION_INFRA', defaultValue: false, description: 'Main only: plan OCI changes; a separate human approval is mandatory before apply.')
        booleanParam(name: 'CONFIGURE_VM', defaultValue: false, description: 'Main only: configure an already approved VM using Ansible.')
        booleanParam(name: 'DEPLOY', defaultValue: false, description: 'Main only: deploy the image after human approval. Requires PUBLISH_IMAGE.')
        booleanParam(name: 'NOTIFY', defaultValue: false, description: 'Main only: send the final build status to the configured Slack webhook credential.')
    }
    environment {
        IMAGE_REPOSITORY = 'ghcr.io/joshi-taro/gradeflow'
        TF_IN_AUTOMATION = 'true'
        TF_INPUT = 'false'
        TF_STATE_PATH = '/var/lib/gradeflow-state/terraform.tfstate'
        ANSIBLE_CONFIG = "${WORKSPACE}/infra/ansible/ansible.cfg"
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.IMAGE = "${env.IMAGE_REPOSITORY}:${env.COMMIT}"
                    if (params.DEPLOY && !params.PUBLISH_IMAGE) error('DEPLOY requires PUBLISH_IMAGE')
                }
            }
        }
        stage('Dependency setup') {
            steps {
                sh '''
                    node -e "if (+process.versions.node.split('.')[0] !== 24) process.exit(1)"
                    npm ci --ignore-scripts
                    python3 -m venv .runtime/venv
                    .runtime/venv/bin/pip install -r infra/ansible/requirements.txt
                '''
            }
        }
        stage('Lint') { steps { sh 'npm run lint' } }
        stage('Tests') { steps { sh 'npm test' } }
        stage('Terraform validation') {
            steps {
                sh '''
                    terraform -chdir=infra/terraform fmt -check -recursive
                    terraform -chdir=infra/terraform init -backend=false -input=false -lockfile=readonly
                    terraform -chdir=infra/terraform validate
                    terraform -chdir=infra/terraform test
                    .runtime/venv/bin/ansible-playbook --syntax-check -i infra/ansible/inventory.ini.example infra/ansible/site.yml
                    for script in scripts/*.sh; do bash -n "$script"; done
                '''
            }
        }
        stage('Docker build and container smoke') {
            when { allOf { branch 'main'; not { changeRequest() } } }
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail
                    docker build --tag "$IMAGE" .
                    cid=$(docker run -d --read-only --tmpfs /tmp:uid=101,gid=101,mode=1777,size=16m \
                      --cap-drop=ALL --security-opt=no-new-privileges -p 127.0.0.1:18081:8080 "$IMAGE")
                    trap 'docker rm -f "$cid" >/dev/null' EXIT
                    for attempt in {1..30}; do
                      if curl -fsS http://127.0.0.1:18081/healthz >/dev/null; then break; fi
                      sleep 1
                    done
                    node scripts/smoke.mjs http://127.0.0.1:18081
                '''
            }
        }
        stage('Publish image') {
            when { allOf { branch 'main'; not { changeRequest() }; expression { params.PUBLISH_IMAGE } } }
            steps {
                withCredentials([usernamePassword(credentialsId: 'ghcr-publisher', usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_TOKEN')]) {
                    sh '''#!/usr/bin/env bash
                        set -euo pipefail
                        set +x
                        export DOCKER_CONFIG=$(mktemp -d)
                        builder="gradeflow-${COMMIT:0:12}-${BUILD_NUMBER}"
                        trap 'docker buildx rm "$builder" >/dev/null 2>&1 || true; rm -rf "$DOCKER_CONFIG"' EXIT
                        printf '%s' "$REGISTRY_TOKEN" | docker login ghcr.io -u "$REGISTRY_USER" --password-stdin
                        docker buildx create --name "$builder" --driver docker-container --use
                        docker buildx build --platform linux/amd64,linux/arm64 --tag "$IMAGE" --push .
                        docker buildx imagetools inspect "$IMAGE"
                        docker buildx imagetools inspect "$IMAGE" --format '{{.Manifest.Digest}}' > .runtime/image-digest
                    '''
                }
                script {
                    def digest = readFile('.runtime/image-digest').trim()
                    if (!(digest ==~ /sha256:[a-f0-9]{64}/)) error('Invalid published image digest')
                    env.RELEASE_IMAGE = "${env.IMAGE_REPOSITORY}@${digest}"
                }
            }
        }
        stage('Terraform infrastructure provisioning (approved only)') {
            when { allOf { branch 'main'; not { changeRequest() }; expression { params.PROVISION_INFRA } } }
            steps {
                withCredentials([
                    file(credentialsId: 'oci-api-key', variable: 'OCI_PRIVATE_KEY_PATH'),
                    file(credentialsId: 'gradeflow-tfvars', variable: 'TFVARS'),
                    string(credentialsId: 'oci-tenancy', variable: 'OCI_TENANCY_OCID'),
                    string(credentialsId: 'oci-user', variable: 'OCI_USER_OCID'),
                    string(credentialsId: 'oci-fingerprint', variable: 'OCI_FINGERPRINT')
                ]) {
                    sh '''
                        set +x
                        umask 077
                        test -d /var/lib/gradeflow-state
                        terraform -chdir=infra/terraform init -reconfigure -input=false -lockfile=readonly -backend-config="path=$TF_STATE_PATH"
                        terraform -chdir=infra/terraform plan -input=false -lock-timeout=60s -var-file="$TFVARS" -out=approved.tfplan
                    '''
                    input message: 'Review the exact plan above, free-tier remaining allowance and capacity. Approve these OCI changes?', submitter: 'gradeflow-admin'
                    sh 'terraform -chdir=infra/terraform apply -input=false -lock-timeout=60s approved.tfplan'
                }
            }
        }
        stage('Ansible configuration') {
            when { allOf { branch 'main'; not { changeRequest() }; expression { params.CONFIGURE_VM } } }
            steps {
                input message: 'Approve configuration of the VM in gradeflow-inventory (SSH hardening and K3s install/upgrade)?', submitter: 'gradeflow-admin'
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'gradeflow-ssh', keyFileVariable: 'SSH_KEY'),
                    file(credentialsId: 'gradeflow-inventory', variable: 'INVENTORY'),
                    file(credentialsId: 'gradeflow-known-hosts', variable: 'KNOWN_HOSTS')
                ]) {
                    sh '''
                        set +x
                        export ANSIBLE_SSH_COMMON_ARGS="-o StrictHostKeyChecking=yes -o UserKnownHostsFile=$KNOWN_HOSTS"
                        .runtime/venv/bin/ansible-playbook -i "$INVENTORY" --private-key "$SSH_KEY" infra/ansible/site.yml
                    '''
                }
            }
        }
        stage('K3s deployment') {
            when { allOf { branch 'main'; not { changeRequest() }; expression { params.DEPLOY } } }
            steps {
                input message: "Approve GradeFlow rollout of ${env.RELEASE_IMAGE} (${env.COMMIT})? Verify the SSH API tunnel and namespace-scoped kubeconfig are ready.", submitter: 'gradeflow-admin'
                withCredentials([file(credentialsId: 'gradeflow-kubeconfig', variable: 'KUBECONFIG')]) {
                    sh 'bash scripts/deploy.sh "$RELEASE_IMAGE"'
                }
            }
        }
        stage('Kubernetes rollout validation') {
            when { allOf { branch 'main'; not { changeRequest() }; expression { params.DEPLOY } } }
            steps {
                withCredentials([file(credentialsId: 'gradeflow-kubeconfig', variable: 'KUBECONFIG')]) {
                    sh 'bash scripts/verify-rollout.sh "$RELEASE_IMAGE" && bash scripts/deploy-smoke.sh'
                }
                script { env.DEPLOY_VERIFIED = 'true' }
            }
        }
    }
    post {
        always {
            script {
                // Visible even without an external notification service.
                echo "GradeFlow ${env.BUILD_TAG}: ${currentBuild.currentResult}; commit=${env.COMMIT ?: 'checkout incomplete'}; ${env.BUILD_URL}"
                currentBuild.description = "${currentBuild.currentResult}: ${(env.COMMIT ?: 'unknown').take(12)}"
                if (env.BRANCH_NAME == 'main' && !env.CHANGE_ID && params.NOTIFY) {
                    withEnv(["BUILD_STATUS=${currentBuild.currentResult}"]) {
                        withCredentials([string(credentialsId: 'gradeflow-status-webhook', variable: 'STATUS_WEBHOOK')]) {
                            catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                                sh 'node scripts/notify.mjs'
                            }
                        }
                    }
                }
            }
            // Plans can contain sensitive infrastructure data: do not archive them.
            sh 'rm -f infra/terraform/approved.tfplan'
            deleteDir()
        }
    }
}
