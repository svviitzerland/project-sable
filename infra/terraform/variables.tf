variable "project" {
  description = "Name prefix for every resource (a codename; the product name stays out of infrastructure)."
  type        = string
  default     = "project-sable"
}

variable "region" {
  description = "AWS region. ap-southeast-1 (Singapore) is closest with Bedrock and Transcribe; ap-southeast-3 (Jakarta) must be opted in first."
  type        = string
  default     = "ap-southeast-1"
}

variable "instance_type" {
  description = "One x86_64 instance runs web, voice, PostgreSQL and Caddy. 4 GB RAM fits pyannote on CPU."
  type        = string
  default     = "t3a.medium"
}

variable "root_volume_gb" {
  description = "Encrypted gp3 root volume for Docker images, PostgreSQL data and the model cache."
  type        = number
  default     = 40
}

variable "domain" {
  description = "Public hostname. Empty uses <elastic-ip>.sslip.io so Caddy can still issue a Let's Encrypt certificate (HTTPS is required for the microphone)."
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "owner/name allowed to deploy through GitHub Actions OIDC."
  type        = string
  default     = "svviitzerland/project-sable"
}

variable "github_immutable_subject" {
  description = "Repository subject prefix when GitHub issues immutable OIDC subjects (owner@id/repo@id), from: gh api repos/<owner>/<repo>/actions/oidc/customization/sub. Empty if the repository uses the classic owner/repo subject."
  type        = string
  default     = "repo:svviitzerland@70313408/project-sable@1441956353"
}

variable "github_branch" {
  description = "Branch whose workflow runs may assume the deploy role."
  type        = string
  default     = "main"
}

variable "create_github_oidc_provider" {
  description = "Create the token.actions.githubusercontent.com OIDC provider. Leave false when the account already has it (one per account)."
  type        = bool
  default     = false
}

variable "bedrock_model" {
  description = "Default-tier model (screening, drafting). The apac profile keeps processing in Asia Pacific regions."
  type        = string
  default     = "apac.amazon.nova-lite-v1:0"
}

variable "bedrock_review_model" {
  description = "Independent review model, from a different family than the default model."
  type        = string
  default     = "global.anthropic.claude-haiku-4-5-20251001-v1:0"
}

variable "enable_demo" {
  description = "Allow the clearly labeled synthetic demo case in production (useful for presentations)."
  type        = bool
  default     = true
}

variable "budget_monthly_usd" {
  description = "Monthly cost budget; alerts go to budget_email when it is set."
  type        = number
  default     = 50
}

variable "budget_email" {
  description = "Email for budget alerts. Empty skips the budget."
  type        = string
  default     = ""
}

variable "snapshot_retention_days" {
  description = "Daily EBS snapshots of the instance volume (PostgreSQL lives on it)."
  type        = number
  default     = 7
}

variable "db_instance_class" {
  description = "RDS PostgreSQL class. db.t4g.micro (2 vCPU burst, 1 GB) is the cheapest that runs pgvector comfortably for case-sized corpora."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_engine_version" {
  description = "PostgreSQL major.minor on RDS (pgvector is included)."
  type        = string
  default     = "17.11"
}

variable "db_backup_days" {
  description = "Automated backup retention with point-in-time restore."
  type        = number
  default     = 7
}

variable "db_deletion_protection" {
  description = "Protect the database from terraform destroy and keep a final snapshot."
  type        = bool
  default     = true
}
