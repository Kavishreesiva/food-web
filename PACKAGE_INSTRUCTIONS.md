# DevOps Project ZIP Packaging

This project can be packaged into a clean transfer ZIP with the Node.js backend,
frontend files, Kubernetes YAML files, and setup script.

## Create ZIP

Run from the project root:

```sh
chmod +x setup.sh package-devops-project.sh
./package-devops-project.sh
```

The script creates:

```text
devops-project.zip
```

The archive is built without an extra parent folder. Internally it uses this ZIP
pattern from a clean staging directory:

```sh
zip -r devops-project.zip . -x "node_modules/*" ".git/*" "logs/*" "*.log"
```

## Excluded Files

The ZIP excludes unnecessary or machine-specific files:

```text
node_modules/
.git/
logs/
*.log
```

Dependencies are restored on the target laptop with `npm install`.

## Verify ZIP Contents

```sh
unzip -l devops-project.zip
```

Expected important files:

```text
server.js
package.json
package-lock.json
deployment.yaml
service.yaml
setup.sh
public/
public/index.html
public/script.js
public/style.css
```

## Transfer And Run On Another Laptop

Copy `devops-project.zip` to the target laptop, then run:

```sh
mkdir devops-project
unzip devops-project.zip -d devops-project
cd devops-project
npm install
node server.js
```

Or use the included setup script:

```sh
cd devops-project
chmod +x setup.sh
./setup.sh
```

The backend starts at:

```text
http://localhost:3000
```

## Kubernetes Files

The Kubernetes manifests are included at archive root:

```sh
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```
