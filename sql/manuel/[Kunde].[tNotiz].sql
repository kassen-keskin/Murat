--select * from [Kunde].[tNotiz]

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
0 as nTyp,
getdate() as dErstellt,
1 as kBenutzer
FROM [Kunde].[lvKunde] 		as K
where 1=1
and K.kKunde = 20





