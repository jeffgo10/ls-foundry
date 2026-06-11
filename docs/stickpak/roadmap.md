# StickPak Comprehensive Roadmap

This is the definitive, end-to-end roadmap to take the sticker printing business from a local development concept to a fully automated, cloud-hosted production system.

By physically splitting the codebase into a core reusable engine and a domain-specific business application, the system remains clean, scalable, and easy to maintain.

## Phase 1: The Core Engine (Inside `ls-foundry` Monorepo) — ✅ Complete

**Goal:** Build the math and visual foundation. This phase knows nothing about cloud infrastructure, users, or payments. It only cares about pixels, coordinates, and dragging images.

- **1.1 Workspace Setup:** Initialize Turborepo or pnpm workspaces in `ls-foundry`.
- **1.2 Types Package (`@jeffgo10/shared-types`):** Define the exact JSON schema for the canvas layout. It should require an array of objects containing `assetId`, `x`, `y`, `scaleX`, `scaleY`, and `rotation`.
- **1.3 The Frontend Canvas UI (`@jeffgo10/react-canvas-designer`):**
  - Set up a `react-konva` Stage locked to a 72 DPI A4 aspect ratio.
  - Implement `react-dropzone` to catch dropped images and render them as Konva `<Image draggable />` nodes.
  - Bind an `onExport` function that generates the state JSON payload based on the types package.
  - Cut-line preview along PNG alpha edges (`showCutLine`).
  - Auto-arrange: pack stickers with cut-line spacing (default 5 mm); imperative `arrangeAll()` on ref. See [engineering-notes.md](./engineering-notes.md).
- **1.4 The Backend Math Upscaler (`@jeffgo10/canvas-upscaler`):**
  - Write a pure Node.js utility utilizing `automattic/node-canvas`.
  - Implement the translation matrix: map the 72 DPI JSON coordinates onto a headless 300 DPI canvas (2481 × 3507 pixels).
  - Create a local testing script to verify that a downloaded test layout mathematically aligns perfectly when exported as a high-res local PNG.

See [phase-1.md](./phase-1.md) for package locations and implementation status in this repo.

## Phase 2: Cloud Infrastructure & Emulation (Dedicated Repo)

**Goal:** Scaffold the business application and define AWS serverless architecture using code, emulating it locally to save money.

- **2.1 Repository & App Initialization:**
  - Create the `sticker-print-app` repository.
  - Scaffold two React applications: `apps/storefront` and `apps/admin-dashboard`.
  - Link the local `@jeffgo10` packages as dependencies.
- **2.2 AWS CDK Definition (`packages/infra`):**
  - Define two `aws_s3.Bucket` resources (High-Res Source Uploads & Protected Print Outputs).
  - Define an `aws_dynamodb.Table` with a Single-Table Design (Partition Key: `PK`, Sort Key: `SK`) to handle both customer order lookups and admin global queries.
  - Define an `aws_sqs.Queue` to handle the asynchronous rendering jobs.
  - Define `aws_lambda.Function` constructs for the REST API layer and the background worker layer.
- **2.3 Local Environment Wiring:**
  - Boot up LocalStack via Docker.
  - Use `cdklocal deploy` to provision the mock S3, DynamoDB, and SQS resources.
  - Use `sam local start-api` to hot-reload API Lambdas.
  - Implement S3 Presigned URLs so the `storefront` React app can upload high-res source images directly into the local mock S3 bucket.

## Phase 3: Identity, Storefront, & Delivery Logic

**Goal:** Authenticate users, let them design stickers using the core engine, and calculate localized delivery fees.

- **3.1 Cognito Authentication:**
  - Deploy an `aws_cognito.UserPool` with Email + Password and Google Identity Federation.
  - Define standard `Customers` and `Admins` User Groups.
  - Integrate AWS Amplify Auth into both React apps for smooth login flows.
- **3.2 The Storefront Integration:**
  - Embed `@jeffgo10/react-canvas-designer` into the `storefront` checkout flow.
- **3.3 Regional Delivery Mapping:**
  - Hardcode or store pricing variables in DynamoDB for the specific delivery perimeter.
  - Create a checkout UI that dynamically updates the total order cost based on the selected dropdown zone: Dumaguete City Proper, Sibulan, Valencia, or Bacong.

## Phase 4: GCash Payments & The Worker Pipeline

**Goal:** Capture real money and guarantee the 300 DPI print file is generated only _after_ the payment clears.

- **4.1 Payment Gateway (PayMongo or Xendit):**
  - Integrate the Node.js SDK into the API Lambda.
  - Generate a secure GCash checkout session link and redirect the customer.
- **4.2 The Webhook State Machine:**
  - Create a public, unauthenticated API endpoint to catch the payment success ping.
  - When the webhook fires, the Lambda validates the signature, marks the DynamoDB order record as `PAID`, and pushes an event payload containing the layout JSON and `orderId` into the SQS Queue.
- **4.3 The Serverless Print Worker:**
  - Bind the background Lambda worker to the SQS queue.
  - When triggered, the worker imports `@jeffgo10/canvas-upscaler`, downloads the high-res source assets from S3 into memory, runs the math, generates the 300 DPI composite, and uploads the final print-ready PNG to the protected S3 output bucket.

## Phase 5: The Admin Command Center

**Goal:** Build the secure internal tool to review orders and download the massive print files without exposing them to the public internet.

- **5.1 API Gateway Route Protection:**
  - Attach a Cognito Authorizer to API Gateway.
  - Configure admin endpoints to reject any JWT token that lacks the `Admins` group flag, returning `403 Forbidden`.
- **5.2 Dashboard Development (`apps/admin-dashboard`):**
  - Build the React UI to list all `PAID` orders fetched from DynamoDB.
- **5.3 Secure File Fulfillment:**
  - When an admin clicks "Download Print File", the backend generates an S3 Presigned Download URL targeting the protected print bucket.
  - Set the URL to expire in 5 minutes, ensuring the master 300 DPI assets remain secure and un-scrapable.

## Phase 6: CI/CD Automation & Financial Safeguards

**Goal:** Automate deployments, launch to production, and lock down the cloud bill.

- **6.1 GitHub Actions Automation:**
  - Configure OpenID Connect (OIDC) between GitHub and the AWS account.
  - Write a workflow to run tests, execute `cdk deploy`, and push compiled React bundles to production S3 buckets behind CloudFront whenever merging to `main`.
- **6.2 Infrastructure Review:**
  - Verify no Lambda functions are placed inside a VPC to avoid NAT Gateway hourly charges.
- **6.3 Billing Alarms:**
  - Configure AWS Budgets to trigger an email alert if the monthly bill projection exceeds a nominal amount (e.g., $5.00).

This separates concerns, keeps costs near zero, and leverages deep React experience to build a professional-grade cloud architecture.
