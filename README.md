# Food-Web: Automated GitOps Pipeline with Argo Rollouts

This project implements a fully automated, self-healing CI/CD pipeline using GitHub Actions, Docker, Kubernetes, Argo CD, and **Argo Rollouts** for safe, progressive delivery.

## Pipeline Workflow

1.  **CI (GitHub Actions):** Every push to the `main` branch triggers a build process. The application is packaged into a Docker image and pushed to DockerHub.
2.  **GitOps (Argo CD):** Argo CD monitors this repository for changes in Kubernetes manifests (`rollout.yaml`, `service.yaml`).
3.  **Progressive Delivery (Argo Rollouts):** Uses a Canary strategy to deploy new versions safely. It starts by sending 50% of traffic to the new version, pauses for 10 seconds for validation, and then completes the rollout to 100%.
4.  **Self-Healing:** If any manual changes are made to the live cluster, Argo CD automatically reverts them to match the state defined in this repository.
5.  **Monitoring & Alerting:** Argo CD Notifications sends real-time health status updates to a Telegram bot.

## Deployment Guide

### 1. Prerequisites
* Kubernetes cluster (e.g., Minikube)
* Argo CD and **Argo Rollouts controller** installed on the cluster
* DockerHub account
* Telegram Bot and Chat ID

### 2. Setup Secrets
In GitHub Repository Secrets, add:
* `DOCKER_USERNAME`: Your DockerHub username
* `DOCKER_PASSWORD`: Your DockerHub password/token

In Argo CD, configure the Telegram token and Chat ID in the `argocd-notifications-secret`.

### 3. Deploy Infrastructure
Apply the Kubernetes manifests:
```bash
kubectl apply -f service.yaml
kubectl apply -f rollout.yaml
```

### 4. Deploy Argo CD Application
```bash
kubectl apply -f argocd/app.yaml
```

### 5. Access the Application
If using Minikube:
```bash
minikube service food-web
```
Or use port-forwarding:
```bash
kubectl port-forward service/food-web 8080:80
```

### 6. Access Argo CD UI
```bash
kubectl port-forward svc/argocd-server -n argocd 8443:443
```

## Progressive Delivery & Automatic Rollback

### Rollout Strategy (Canary)
The project uses the following canary steps defined in `rollout.yaml`:
* **SetWeight: 50**: Routes 50% of traffic to the new version.
* **Pause: 10s**: Wait for 10 seconds to allow for initial validation.
* **Analysis**: Automatically checks the health of the new version using `AnalysisTemplate`.
* **SetWeight: 100**: Routes all traffic to the new version if all health checks pass.

### Automatic Rollback
The system is configured to automatically detect and revert bad deployments:
* **Health Checks Detect Failure**: Argo Rollouts executes background analysis during the deployment. If the success rate drops or health checks fail, it is immediately detected.
* **Rollout Pauses and Aborts**: Upon detecting failure, the rollout strategy enters an `Aborted` state.
* **Traffic Remains on Stable Version**: The system automatically switches all traffic back to the previous stable version, ensuring zero downtime and minimal impact on users.

## How to Test Failure (Self-Healing)
1.  Manually delete a pod or scale the rollout to 0:
    ```bash
    kubectl scale rollout food-web --replicas=0
    ```
2.  Watch Argo CD automatically scale it back to 2 replicas to maintain the desired state.
3.  Check Telegram for health degradation alerts.

## Project Structure
* `Dockerfile`: Nginx-based containerization.
* `.github/workflows/deploy.yml`: CI pipeline definition.
* `rollout.yaml`: Argo Rollouts resource for progressive delivery.
* `service.yaml`: K8s NodePort service.
* `argocd/`: GitOps and Notification configurations.
