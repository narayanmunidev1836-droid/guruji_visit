-- Users can also log in with a username or a mobile number (both optional for existing users, unique when set).
ALTER TABLE "User" ADD COLUMN "username" TEXT, ADD COLUMN "mobileNo" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_mobileNo_key" ON "User"("mobileNo");
