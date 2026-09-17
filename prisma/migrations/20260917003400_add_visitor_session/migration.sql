-- CreateTable
CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "leftAt" DATETIME,
    "convertedAt" DATETIME,
    "leadOrderId" TEXT,
    "device" TEXT,
    "currentPath" TEXT,
    "cartItems" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitorSession_sessionId_key" ON "VisitorSession"("sessionId");

-- CreateIndex
CREATE INDEX "VisitorSession_visitorId_idx" ON "VisitorSession"("visitorId");

-- CreateIndex
CREATE INDEX "VisitorSession_lastSeenAt_idx" ON "VisitorSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "VisitorSession_firstSeenAt_idx" ON "VisitorSession"("firstSeenAt");

-- CreateIndex
CREATE INDEX "VisitorSession_convertedAt_idx" ON "VisitorSession"("convertedAt");

-- CreateIndex
CREATE INDEX "VisitorSession_isActive_lastSeenAt_idx" ON "VisitorSession"("isActive", "lastSeenAt");
