#!/usr/bin/env bash
set -euo pipefail

TARGET_ACCOUNT_ID="500763020267"
DEFAULT_REGION="ap-south-1"
STACK_NAME="healthcare-ai-platform"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="${SCRIPT_DIR}/aws-cloudformation.yaml"

echo "=========================================================="
echo "🏥 Healthcare AI Platform - AWS Automated Deployment"
echo "=========================================================="
echo "Target AWS Account: ${TARGET_ACCOUNT_ID}"
echo "Stack Name:         ${STACK_NAME}"
echo "=========================================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "❌ AWS CLI is not installed."
  echo "Install it via: brew install awscli"
  echo "Or use AWS CloudShell directly inside your AWS Console."
  exit 1
fi

# Check credentials
CURRENT_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text 2>/dev/null || true)
if [ -z "$CURRENT_ACCOUNT" ]; then
  echo "❌ No active AWS credentials found. Please run 'aws configure' first."
  exit 1
fi

if [ "$CURRENT_ACCOUNT" != "$TARGET_ACCOUNT_ID" ]; then
  echo "⚠️  Warning: Currently authenticated AWS Account is: $CURRENT_ACCOUNT"
  echo "Target Account is: $TARGET_ACCOUNT_ID"
  read -p "Do you want to continue with account $CURRENT_ACCOUNT? (y/N): " -r CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Aborted. Switch AWS profile/credentials and re-run."
    exit 1
  fi
fi

REGION="${AWS_REGION:-$DEFAULT_REGION}"
echo "Deploying to region: ${REGION}..."

aws cloudformation deploy \
  --template-file "${TEMPLATE_FILE}" \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
      AdminEmail="mdzeeshank578@gmail.com" \
      AdminName="zeeshan" \
      InstanceType="t3a.medium"

echo ""
echo "✅ CloudFormation deployment completed successfully!"
echo ""
echo "Retrieving stack outputs..."
aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs" \
  --output table

PUBLIC_IP=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='PublicIP'].OutputValue" \
  --output text)

echo ""
echo "=========================================================="
echo "🎉 Deployment Live!"
echo "Server Public IP:       ${PUBLIC_IP}"
echo "Doctor Dashboard URL:   http://${PUBLIC_IP}"
echo "Backend API Health:     http://${PUBLIC_IP}/api/v1/health"
echo "AI Microservice Docs:   http://${PUBLIC_IP}:8000/docs"
echo "=========================================================="
