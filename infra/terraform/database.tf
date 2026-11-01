# Managed PostgreSQL (RDS) outside the app server: automated backups, point-in-time
# restore and pgvector. Private subnets have no internet route; only the web instance's
# security group may connect, and TLS is enforced by the rds.force_ssl parameter.
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.40.0.0/16", 8, 10 + count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${var.project}-private-${count.index}" }
}

resource "aws_db_subnet_group" "main" {
  name       = var.project
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_security_group" "db" {
  name        = "${var.project}-db"
  description = "PostgreSQL from the web instance only"
  vpc_id      = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "db_from_web" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.web.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL from the web instance"
}

resource "aws_db_parameter_group" "postgres" {
  name   = "${var.project}-pg17"
  family = "postgres17"
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_instance" "main" {
  identifier                   = var.project
  engine                       = "postgres"
  engine_version               = var.db_engine_version
  instance_class               = var.db_instance_class
  allocated_storage            = 20
  max_allocated_storage        = 100
  storage_type                 = "gp3"
  storage_encrypted            = true
  db_name                      = "app"
  username                     = "app"
  password                     = random_password.db.result
  db_subnet_group_name         = aws_db_subnet_group.main.name
  vpc_security_group_ids       = [aws_security_group.db.id]
  parameter_group_name         = aws_db_parameter_group.postgres.name
  publicly_accessible          = false
  multi_az                     = false
  backup_retention_period      = var.db_backup_days
  backup_window                = "18:00-19:00" # 01:00-02:00 WIB
  maintenance_window           = "sun:19:30-sun:20:30"
  auto_minor_version_upgrade   = true
  deletion_protection          = var.db_deletion_protection
  skip_final_snapshot          = !var.db_deletion_protection
  final_snapshot_identifier    = var.db_deletion_protection ? "${var.project}-final" : null
  performance_insights_enabled = false
  copy_tags_to_snapshot        = true
}
