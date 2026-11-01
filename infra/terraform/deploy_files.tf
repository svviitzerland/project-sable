# The Compose stack and deploy script live in the ops bucket; the instance syncs them on
# every deploy, and GitHub Actions re-uploads them so infra/docker changes ship with code.
resource "aws_s3_object" "deploy" {
  for_each = toset(["compose.yaml", "Caddyfile", "deploy.sh"])
  bucket   = aws_s3_bucket.ops.id
  key      = "deploy/${each.key}"
  source   = "${path.module}/../docker/${each.key}"
  etag     = filemd5("${path.module}/../docker/${each.key}")
}
