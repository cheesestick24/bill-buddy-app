CREATE TABLE Users (
    id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(255) NOT NULL UNIQUE,
    email NVARCHAR(255) NOT NULL UNIQUE,
    passwordHash NVARCHAR(255) NOT NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    updatedAt DATETIME DEFAULT GETDATE()
);

CREATE TABLE BillRecords (
    id INT PRIMARY KEY IDENTITY(1,1),
    userId INT NOT NULL,
    date DATE NOT NULL,
    totalAmount DECIMAL(10, 2) NOT NULL,
    category NVARCHAR(255),
    location NVARCHAR(255),
    memo NVARCHAR(255),
    payer NVARCHAR(50) NOT NULL,
    splitRatio INT,
    myShare DECIMAL(10, 2),
    theirShare DECIMAL(10, 2),
    isSettled BIT DEFAULT 0 NOT NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    updatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id)
);

UPDATE BillRecords
SET isSettled = 0
WHERE id % 2 = 0;
