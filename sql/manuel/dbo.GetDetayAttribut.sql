--[Custom].[KundenAttribut]


CREATE FUNCTION [Custom].fnGetDetayAttribut
(
    @kKunde int
)
RETURNS VARCHAR(5000)
AS
BEGIN
    DECLARE @Detay varchar(5000)
    SELECT @Detay = COALESCE(@Detay , '') + ISNULL(MT.Detay ,'')
    FROM 
	(
		SELECT 
		 Detay
		,kKunde
		,cGruppeName
		,kAttribut
		FROM [Custom].[KundenAttribut] with(nolock)
		where 1=1
		
	) as MT
WHERE MT.kKunde=@kKunde
order by 
	MT.cGruppeName,
	MT.kAttribut

RETURN @Detay

END