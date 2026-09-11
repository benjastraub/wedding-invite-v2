#!/usr/bin/env bash
#
# One-time Google Cloud setup for the wedding invite site.
#
#   bash scripts/gcp-setup.sh [PROJECT_ID] [SA_NAME] [REGION] [--with-local-key]
#
#   PROJECT_ID   GCP project (defaults to your active gcloud project)
#   SA_NAME      Service account name (default: wedding-invite)
#   REGION       Region for Artifact Registry (default: us-central1)
#   --with-local-key  Optional flag (may appear anywhere): also download a JSON
#                     key for local development (service-account-key.json —
#                     gitignored, never commit).
#
# What it does:
#   1. Enables: Cloud Run, Google Sheets API, Google Drive API, Cloud Build,
#      Artifact Registry.
#   2. Creates the service account the site uses.
#   3. Creates the Artifact Registry repository for the Docker image.
#   4. Prints the service account email — share your sheet with it as EDITOR
#      and your photos Drive folder with it as VIEWER.
#
set -euo pipefail

# Positional args (PROJECT_ID, SA_NAME, REGION) plus an optional
# --with-local-key flag that may appear anywhere. Unknown flags and extra
# arguments are rejected.
PROJECT_ID=""
SA_NAME=""
REGION=""
WITH_KEY=""
REPOSITORY="${REPOSITORY:-wedding}"

positional_count=0
for arg in "$@"; do
  case "$arg" in
    --with-local-key)
      WITH_KEY="$arg"
      ;;
    -*)
      echo "Unknown flag: $arg" >&2
      echo "Usage: bash scripts/gcp-setup.sh [PROJECT_ID] [SA_NAME] [REGION] [--with-local-key]" >&2
      exit 1
      ;;
    *)
      positional_count=$((positional_count + 1))
      case "$positional_count" in
        1) PROJECT_ID="$arg" ;;
        2) SA_NAME="$arg" ;;
        3) REGION="$arg" ;;
        *)
          echo "Unexpected argument: $arg" >&2
          echo "Usage: bash scripts/gcp-setup.sh [PROJECT_ID] [SA_NAME] [REGION] [--with-local-key]" >&2
          exit 1
          ;;
      esac
      ;;
  esac
done

if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
fi
SA_NAME="${SA_NAME:-wedding-invite}"
REGION="${REGION:-us-central1}"

if [ -z "$PROJECT_ID" ]; then
  echo "No GCP project found."
  echo "Usage: bash scripts/gcp-setup.sh [PROJECT_ID] [SA_NAME] [REGION] [--with-local-key]"
  exit 1
fi

echo "==> Project: $PROJECT_ID"
echo "==> Enabling APIs (Cloud Run, Google Sheets, Google Drive, Cloud Build, Artifact Registry)..."
gcloud services enable \
  run.googleapis.com \
  sheets.googleapis.com \
  drive.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project "$PROJECT_ID"

SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "==> Service account already exists: $SA_EMAIL"
else
  echo "==> Creating service account $SA_NAME..."
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name "Wedding invite site" \
    --description "Reads/writes the wedding Google Sheet and runs the Cloud Run service" \
    --project "$PROJECT_ID"
fi

# No IAM roles are needed for the SITE's service account: Google Sheets access
# is granted by sharing the spreadsheet with it as EDITOR, and Google Drive
# access by sharing the photos folder with it as VIEWER.
#
# Cloud Build, however, needs two grants to run the deploy step in
# cloudbuild.yaml on a fresh project: deploy rights on Cloud Run, and
# permission to run the service AS this service account. Without these the
# build's deploy step fails with a permission error.
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CB_EMAIL="$PROJECT_NUMBER@cloudbuild.gserviceaccount.com"
echo "==> Granting Cloud Build ($CB_EMAIL) permission to deploy to Cloud Run..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CB_EMAIL" \
  --role="roles/run.admin"
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --member="serviceAccount:$CB_EMAIL" \
  --role="roles/iam.serviceAccountUser"

if ! gcloud artifacts repositories describe "$REPOSITORY" \
  --location="$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry repository '$REPOSITORY' in $REGION..."
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --project "$PROJECT_ID"
fi

echo ""
echo "Done ✔"
echo ""
echo "Next steps:"
echo "  1. Create the data sheet (see README step 3):"
echo "       - create a blank Google Sheet, put its ID in .env, share it with"
echo "         the service account above as EDITOR, then"
echo "       - gcloud auth application-default login && npm run sheet:setup"
echo ""
echo "  2. Share the sheet with this service account as EDITOR:"
echo "       $SA_EMAIL"
echo "     (Google Sheets access = sharing, not IAM. No project roles needed.)"
echo ""
echo "  3. Optional photos: create a Drive folder, upload your photos and share"
echo "     the FOLDER with the same email as VIEWER. Put the folder ID in .env:"
echo "       GOOGLE_DRIVE_FOLDER_ID=<folder id from the folder URL>"
echo ""
echo "  4. Optional — local development key file:"
echo "       gcloud iam service-accounts keys create service-account-key.json \\"
echo "         --iam-account=$SA_EMAIL"
echo "     then set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json in .env"
echo ""
echo "  5. Deploy (see README) — set _SHEET_ID to your spreadsheet ID:"
echo "       gcloud builds submit --config=cloudbuild.yaml \\"
echo "         --substitutions=_SHEET_ID=YOUR_SPREADSHEET_ID"
echo "     or connect a GitHub trigger for automatic deploys."

if [ "$WITH_KEY" = "--with-local-key" ]; then
  echo ""
  echo "==> Downloading local key (service-account-key.json — gitignored)..."
  gcloud iam service-accounts keys create service-account-key.json \
    --iam-account "$SA_EMAIL"
  echo "Key written. Never commit it."
fi
