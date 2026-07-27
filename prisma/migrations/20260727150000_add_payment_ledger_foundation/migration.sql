CREATE TABLE `PaymentAttempt` (
  `id` VARCHAR(191) NOT NULL,
  `provider` ENUM('SQUARE', 'PAYPAL', 'MANUAL') NOT NULL,
  `providerPaymentId` VARCHAR(191) NULL,
  `providerOrderId` VARCHAR(191) NULL,
  `providerReceiptUrl` TEXT NULL,
  `receiptReference` VARCHAR(191) NULL,
  `providerStatus` VARCHAR(191) NULL,
  `websiteStatus` ENUM(
    'CREATED',
    'PENDING',
    'REQUIRES_ACTION',
    'PAID',
    'FAILED',
    'CANCELLED',
    'EXPIRED',
    'PARTIALLY_REFUNDED',
    'REFUNDED'
  ) NOT NULL DEFAULT 'CREATED',
  `paymentPurpose` ENUM(
    'ORDER_TOTAL',
    'SERVICE_DEPOSIT',
    'SERVICE_FINAL_BALANCE',
    'REFUND',
    'RETRY'
  ) NOT NULL,
  `amountCents` INTEGER UNSIGNED NOT NULL,
  `tipCents` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NULL,
  `serviceRequestId` VARCHAR(191) NULL,
  `parentPaymentId` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NULL,
  `paidAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `refundedAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PaymentAttempt_idempotencyKey_key`(`idempotencyKey`),
  INDEX `PaymentAttempt_orderId_createdAt_idx`(`orderId`, `createdAt`),
  INDEX `PaymentAttempt_serviceRequestId_createdAt_idx`(`serviceRequestId`, `createdAt`),
  INDEX `PaymentAttempt_provider_providerStatus_idx`(`provider`, `providerStatus`),
  INDEX `PaymentAttempt_provider_providerOrderId_idx`(`provider`, `providerOrderId`),
  INDEX `PaymentAttempt_websiteStatus_expiresAt_idx`(`websiteStatus`, `expiresAt`),
  INDEX `PaymentAttempt_parentPaymentId_idx`(`parentPaymentId`),
  UNIQUE INDEX `PaymentAttempt_provider_providerPaymentId_key`(`provider`, `providerPaymentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentWebhookEvent` (
  `id` VARCHAR(191) NOT NULL,
  `provider` ENUM('SQUARE', 'PAYPAL', 'MANUAL') NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(191) NOT NULL,
  `paymentAttemptId` VARCHAR(191) NULL,
  `processingStatus` ENUM(
    'RECEIVED',
    'PROCESSING',
    'PROCESSED',
    'FAILED',
    'IGNORED'
  ) NOT NULL DEFAULT 'RECEIVED',
  `payloadHash` CHAR(64) NULL,
  `rawSummary` JSON NULL,
  `sanitizedProcessingError` TEXT NULL,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PaymentWebhookEvent_provider_eventId_key`(`provider`, `eventId`),
  INDEX `PaymentWebhookEvent_paymentAttemptId_receivedAt_idx`(`paymentAttemptId`, `receivedAt`),
  INDEX `PaymentWebhookEvent_processingStatus_receivedAt_idx`(`processingStatus`, `receivedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentRetryToken` (
  `id` VARCHAR(191) NOT NULL,
  `paymentAttemptId` VARCHAR(191) NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PaymentRetryToken_tokenHash_key`(`tokenHash`),
  INDEX `PaymentRetryToken_paymentAttemptId_expiresAt_idx`(`paymentAttemptId`, `expiresAt`),
  INDEX `PaymentRetryToken_expiresAt_consumedAt_revokedAt_idx`(`expiresAt`, `consumedAt`, `revokedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PaymentAttempt`
  ADD CONSTRAINT `PaymentAttempt_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PaymentAttempt_serviceRequestId_fkey`
  FOREIGN KEY (`serviceRequestId`) REFERENCES `CateringRequest`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PaymentAttempt_parentPaymentId_fkey`
  FOREIGN KEY (`parentPaymentId`) REFERENCES `PaymentAttempt`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PaymentWebhookEvent`
  ADD CONSTRAINT `PaymentWebhookEvent_paymentAttemptId_fkey`
  FOREIGN KEY (`paymentAttemptId`) REFERENCES `PaymentAttempt`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PaymentRetryToken`
  ADD CONSTRAINT `PaymentRetryToken_paymentAttemptId_fkey`
  FOREIGN KEY (`paymentAttemptId`) REFERENCES `PaymentAttempt`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
