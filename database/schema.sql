CREATE TABLE Users (
    id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(255) NOT NULL UNIQUE,
    email NVARCHAR(255) NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT GETDATE()
);

CREATE TABLE BillRecords (
    id INT PRIMARY KEY IDENTITY(1,1),
    userId INT NOT NULL,
    date DATE NOT NULL,
    totalAmount DECIMAL(10, 2) NOT NULL,
    location NVARCHAR(255),
    memo NVARCHAR(255),
    splitRatio INT NULL,
    roundingOption NVARCHAR(50) NULL,
    myShare DECIMAL(10, 2) NULL,
    theirShare DECIMAL(10, 2) NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    isSettled BIT DEFAULT 0 NOT NULL,
    category NVARCHAR(255),
    FOREIGN KEY (userId) REFERENCES Users(id)
);

CREATE TABLE OTP (
    id INT PRIMARY KEY IDENTITY(1,1),
    userId INT NOT NULL,
    otp NVARCHAR(6) NOT NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    expiresAt DATETIME NOT NULL,
    FOREIGN KEY (userId) REFERENCES Users(id)
);
