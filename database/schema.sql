CREATE TABLE Users (
    id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(255) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    createdAt DATETIME DEFAULT GETDATE()
);

CREATE TABLE BillRecords (
    id INT PRIMARY KEY IDENTITY(1,1),
    userId INT NOT NULL,
    date DATE NOT NULL,
    totalAmount DECIMAL(10, 2) NOT NULL,
    location NVARCHAR(255),
    memo NVARCHAR(255),
    splitRatio INT NOT NULL,
    roundingOption NVARCHAR(50) NOT NULL,
    myShare DECIMAL(10, 2) NOT NULL,
    theirShare DECIMAL(10, 2) NOT NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id)
);
