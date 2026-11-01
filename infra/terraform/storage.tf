# Private bucket for case originals (S3_BUCKET in the app) and an ops bucket for deploy files.
resource "aws_s3_bucket" "documents" {
  bucket_prefix = "${var.project}-documents-"
  force_destroy = false
}

resource "aws_s3_bucket" "ops" {
  bucket_prefix = "${var.project}-ops-"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "all" {
  for_each                = { documents = aws_s3_bucket.documents.id, ops = aws_s3_bucket.ops.id }
  bucket                  = each.value
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "all" {
  for_each = { documents = aws_s3_bucket.documents.id, ops = aws_s3_bucket.ops.id }
  bucket   = each.value
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "all" {
  for_each = { documents = aws_s3_bucket.documents.id, ops = aws_s3_bucket.ops.id }
  bucket   = each.value
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Deny any request that is not over TLS.
data "aws_iam_policy_document" "tls_only" {
  for_each = { documents = aws_s3_bucket.documents.arn, ops = aws_s3_bucket.ops.arn }
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    resources = [each.value, "${each.value}/*"]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "tls_only" {
  for_each   = { documents = aws_s3_bucket.documents.id, ops = aws_s3_bucket.ops.id }
  bucket     = each.value
  policy     = data.aws_iam_policy_document.tls_only[each.key].json
  depends_on = [aws_s3_bucket_public_access_block.all]
}

# Container images built by GitHub Actions.
resource "aws_ecr_repository" "app" {
  for_each             = toset(["web", "voice", "migrate"])
  name                 = "${var.project}-${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 5 images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 5 }
      action       = { type = "expire" }
    }]
  })
}

# Generated secrets. They live in Terraform state, so keep the state private.
resource "random_password" "db" {
  length  = 32
  special = false
}

resource "random_password" "voice_token" {
  length  = 40
  special = false
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.project}/db_password"
  type  = "SecureString"
  value = random_password.db.result
}

resource "aws_ssm_parameter" "voice_token" {
  name  = "/${var.project}/voice_token"
  type  = "SecureString"
  value = random_password.voice_token.result
}
