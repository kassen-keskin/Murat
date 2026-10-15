ALTER FUNCTION dbo.GetNextAuftragsNr
(
    @SiraNo INT
)
RETURNS VARCHAR(50)
AS
BEGIN
    DECLARE @NextNr VARCHAR(50)
    DECLARE @MaxNr INT

    SELECT 
        @MaxNr =
        MAX(
            CAST(
                SUBSTRING(
                    cAuftragsNr,
                    LEN(cAuftragsNr) - CHARINDEX('-', REVERSE(cAuftragsNr)) + 2,
                    LEN(cAuftragsNr)
                ) AS INT
            )
        )
    FROM Verkauf.vAuftrag WITH (NOLOCK)
    WHERE cAuftragsNr LIKE 'AU-' + CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-%'

    SET @NextNr =
        'AU-' + CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-' +
        CAST(ISNULL(@MaxNr, 0) + @SiraNo AS VARCHAR)

    RETURN @NextNr
END