pipeline {
    // Main-only multibranch job. Never schedule PR code on this trusted agent.
    agent { label 'gradeflow-local' }
    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }
    parameters {
        booleanParam(name: 'DEPLOY_LOCAL', defaultValue: false, description: 'Create/reconcile local kind and deploy two replicas (main only).')
        booleanParam(name: 'DEPLOY_RENDER', defaultValue: false, description: 'After local verification, request approval to deploy the same commit to Render Free.')
    }
    environment {
        TF_IN_AUTOMATION = 'true'
        TF_INPUT = 'false'
    }
    stages {
        stage('Checkout and release guard') {
            steps {
                script {
                    if (env.BRANCH_NAME != 'main' || env.CHANGE_ID) error('This trusted Jenkins job is main-only; PR checks run in GitHub Actions.')
                    if (params.DEPLOY_RENDER && !params.DEPLOY_LOCAL) error('Render requires DEPLOY_LOCAL in the same build.')
                }
                checkout scm
                script {
                    env.COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.IMAGE = "gradeflow:${env.COMMIT}"
                }
                sh '''
                    test "$(git remote get-url origin)" = https://github.com/Joshi-taro/GradeFlow.git
                    git fetch origin main
                    git merge-base --is-ancestor "$COMMIT" origin/main
                '''
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
        stage('Terraform local validation') {
            steps {
                // Controller infrastructure is applied once by its operator, not
                // by a job that could replace its own controller. No cloud provider.
                sh '''
                    terraform -chdir=infra/local fmt -check -recursive
                    terraform -chdir=infra/local init -backend=false -input=false -lockfile=readonly
                    terraform -chdir=infra/local validate
                    terraform -chdir=infra/local test
                    .runtime/venv/bin/ansible-playbook --syntax-check -i localhost, infra/ansible/local.yml
                    for script in scripts/*.sh; do bash -n "$script"; done
                '''
            }
        }
        stage('Docker build and smoke') {
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
        stage('Ansible local kind configuration') {
            when { expression { params.DEPLOY_LOCAL } }
            steps {
                sh '.runtime/venv/bin/ansible-playbook -i localhost, infra/ansible/local.yml'
            }
        }
        stage('Kubernetes deploy and rollout validation') {
            when { expression { params.DEPLOY_LOCAL } }
            steps { sh 'bash scripts/local-deploy.sh "$IMAGE"' }
        }
        stage('Approve public Render release') {
            when { expression { params.DEPLOY_RENDER } }
            steps {
                input message: "Approve PUBLIC Render Free deployment of tested main commit ${env.COMMIT}? Confirm Free plan and auto-deploy OFF.", submitter: 'gradeflow-admin'
            }
        }
        stage('Render deploy and public URL verification') {
            when { expression { params.DEPLOY_RENDER } }
            steps {
                withCredentials([
                    string(credentialsId: 'render-api-key', variable: 'RENDER_API_KEY'),
                    string(credentialsId: 'render-service-id', variable: 'RENDER_SERVICE_ID')
                ]) {
                    withEnv(['RENDER_APPROVED=yes']) {
                        sh 'set +x; node scripts/render-deploy.mjs'
                    }
                }
            }
        }
    }
    post {
        always {
            script {
                echo "GradeFlow ${currentBuild.currentResult}; commit=${env.COMMIT ?: 'unknown'}; ${env.BUILD_URL}"
                currentBuild.description = "${currentBuild.currentResult}: ${(env.COMMIT ?: 'unknown').take(12)}"
            }
            deleteDir()
        }
    }
}
