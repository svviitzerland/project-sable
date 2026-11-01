#!/bin/bash
# Runs on the instance (first boot and every GitHub Actions deploy through SSM).
# Usage: /opt/<project>/deploy.sh <web-tag> [voice-tag]
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
set -a; source instance.env; set +a

TAG="${1:-latest}"
VOICE_TAG="${2:-latest}"

# Refresh the stack files; this script itself is replaced by the caller before it runs.
aws s3 cp "s3://${JUDE_OPS_BUCKET}/deploy/" . --recursive --region "$AWS_REGION" \
  --exclude deploy.sh --quiet

secret() {
  aws ssm get-parameter --region "$AWS_REGION" --name "$1" --with-decryption \
    --query Parameter.Value --output text
}
umask 077
{
  cat instance.env
  echo "DB_PASSWORD=$(secret "$DB_PASSWORD_PARAM")"
  echo "VOICE_TOKEN=$(secret "$VOICE_TOKEN_PARAM")"
  echo "JUDE_TAG=$TAG"
  echo "JUDE_VOICE_TAG=$VOICE_TAG"
} > .env

# RDS certificate authorities for verified TLS to the database.
# Containers run as non-root users: the directory and bundle must be world-readable.
mkdir -p certs && chmod 755 certs
curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o certs/rds-ca.pem.tmp
mv certs/rds-ca.pem.tmp certs/rds-ca.pem
chmod 644 certs/rds-ca.pem

aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$JUDE_REGISTRY" >/dev/null

docker compose pull --quiet
docker compose up -d --remove-orphans
# The one-shot migrate service exits; wait only for the web app to report healthy.
timeout 600 bash -c 'until [ "$(docker inspect -f "{{.State.Health.Status}}" "$(docker compose ps -q web)")" = healthy ]; do sleep 5; done'
docker compose logs migrate --no-log-prefix | tail -3
docker image prune -f >/dev/null
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
