# One EC2 instance runs the Docker Compose stack in infra/docker. Access is through SSM
# Session Manager (no SSH key, no port 22); containers use the instance role for AWS APIs.
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "instance" {
  name               = "${var.project}-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "instance" {
  statement {
    sid       = "Documents"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.documents.arn}/*"]
  }
  statement {
    sid       = "DeployFiles"
    actions   = ["s3:GetObject", "s3:ListBucket"]
    resources = [aws_s3_bucket.ops.arn, "${aws_s3_bucket.ops.arn}/*"]
  }
  statement {
    sid       = "PullImages"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid       = "PullImageLayers"
    actions   = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"]
    resources = [for repo in aws_ecr_repository.app : repo.arn]
  }
  statement {
    sid       = "Secrets"
    actions   = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = [
      aws_ssm_parameter.db_password.arn,
      aws_ssm_parameter.voice_token.arn,
      # Optional Pasal.id key, created outside Terraform so it never enters state.
      "arn:${data.aws_partition.current.partition}:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/pasal_api_key",
    ]
  }
  statement {
    sid = "Bedrock"
    # Inference profiles route to foundation models in several regions.
    actions = ["bedrock:InvokeModel", "bedrock:Converse"]
    resources = [
      "arn:${data.aws_partition.current.partition}:bedrock:*::foundation-model/*",
      "arn:${data.aws_partition.current.partition}:bedrock:*:${data.aws_caller_identity.current.account_id}:inference-profile/*",
    ]
  }
  statement {
    sid       = "Transcribe"
    actions   = ["transcribe:StartStreamTranscriptionWebSocket", "transcribe:StartStreamTranscription"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "instance" {
  name   = "${var.project}-instance"
  role   = aws_iam_role.instance.id
  policy = data.aws_iam_policy_document.instance.json
}

resource "aws_iam_instance_profile" "instance" {
  name = "${var.project}-instance"
  role = aws_iam_role.instance.name
}

resource "aws_eip" "web" {
  domain = "vpc"
  tags   = { Name = var.project }
}

locals {
  domain = var.domain != "" ? var.domain : "${replace(aws_eip.web.public_ip, ".", "-")}.sslip.io"
  instance_env = {
    AWS_REGION           = var.region
    JUDE_PROJECT         = var.project
    JUDE_DOMAIN          = local.domain
    JUDE_REGISTRY        = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
    JUDE_OPS_BUCKET      = aws_s3_bucket.ops.id
    S3_BUCKET            = aws_s3_bucket.documents.id
    BEDROCK_MODEL        = var.bedrock_model
    BEDROCK_REVIEW_MODEL = var.bedrock_review_model
    JUDE_DEMO            = var.enable_demo ? "1" : "0"
    DB_HOST              = aws_db_instance.main.address
    DB_PASSWORD_PARAM    = aws_ssm_parameter.db_password.name
    VOICE_TOKEN_PARAM    = aws_ssm_parameter.voice_token.name
  }
}

resource "aws_instance" "web" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.web.id]
  iam_instance_profile        = aws_iam_instance_profile.instance.name
  user_data_replace_on_change = false
  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    instance_env = join("\n", [for k, v in local.instance_env : "${k}=${v}"])
    ops_bucket   = aws_s3_bucket.ops.id
    project      = var.project
    region       = var.region
  })

  metadata_options {
    http_tokens = "required"
    # Containers on the Docker bridge are one extra hop away from IMDS.
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_gb
    encrypted   = true
    tags        = { Name = var.project, Backup = "${var.project}-daily" }
  }

  lifecycle {
    ignore_changes = [ami]
  }
  depends_on = [aws_s3_object.deploy]

  tags = { Name = var.project }
}

resource "aws_eip_association" "web" {
  instance_id   = aws_instance.web.id
  allocation_id = aws_eip.web.id
}
