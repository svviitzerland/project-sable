output "url" {
  description = "Public HTTPS URL (Caddy issues the certificate on first request)."
  value       = "https://${local.domain}"
}

output "instance_id" {
  value = aws_instance.web.id
}

output "public_ip" {
  value = aws_eip.web.public_ip
}

output "documents_bucket" {
  value = aws_s3_bucket.documents.id
}

output "ops_bucket" {
  value = aws_s3_bucket.ops.id
}

output "ecr_registry" {
  value = local.instance_env.JUDE_REGISTRY
}

output "github_deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN secret in GitHub."
  value       = aws_iam_role.github_deploy.arn
}

output "ssm_session" {
  description = "Open a shell on the instance without SSH."
  value       = "aws ssm start-session --region ${var.region} --target ${aws_instance.web.id}"
}
