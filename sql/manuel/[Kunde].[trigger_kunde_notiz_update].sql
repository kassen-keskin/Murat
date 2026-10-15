CREATE TRIGGER [Kunde].[trigger_kunde_notiz_update]
ON [Kunde].[tKundeEigenesFeld]
AFTER UPDATE
AS

DECLARE @kKunde INT

SELECT @kKunde = kKunde FROM INSERTED

IF (ISNULL( (select top 1 cNotiz from [Kunde].[tNotiz] with(nolock) where nTyp = 1 and kKunde = @kKunde order by dErstellt desc  ) ,'') >'') 
BEGIN
UPDATE [Kunde].[tNotiz] set
           [cNotiz] = dbo.GetDetay(@kKunde)
           ,[dErstellt] = getdate()
where 
kKunde = @kKunde 
and nTyp = 1

END
ELSE
BEGIN
INSERT INTO [Kunde].[tNotiz]
           ([kKunde]
           ,[kAuftrag]
           ,[cNotiz]
           ,[nTyp]
           ,[dErstellt]
           ,[kBenutzer])

SELECT
K.kKunde as kKunde,
0 as kAuftrag,
dbo.GetDetay(K.kKunde) as cNotiz,
1 as nTyp,
getdate() as dErstellt,
1 as kBenutzer
FROM [Kunde].[lvKunde] 		as K with(nolock)
where 1=1

and ISNULL( (select top 1 cNotiz from [Kunde].[tNotiz] with(nolock) where nTyp = 1 and kKunde = @kKunde order by dErstellt desc  ) ,'') 
<>
dbo.GetDetay(@kKunde)
and K.kKunde = @kKunde
END

GO


