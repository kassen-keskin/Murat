CREATE FUNCTION [Custom].fnGetDetay
(
    @kKunde int
)
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @Result NVARCHAR(MAX)

    SELECT @Result = 
        STRING_AGG(Detay,'') 
        WITHIN GROUP (ORDER BY cGruppeName, kAttribut)
    FROM [Custom].[KundenAttribut] WITH (NOLOCK)
    WHERE kKunde = @kKunde

    RETURN @Result
END