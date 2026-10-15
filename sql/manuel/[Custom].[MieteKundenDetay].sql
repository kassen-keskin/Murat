ALTER VIEW [Custom].[MieteKundenDetay] as
SELECT 
	kKunde,
	Detay	
FROM [Custom].[KundenAttribut] as K with(nolock)
where 1 = 1
--and K.kKunde in (select kKunde from [Custom].[MieteKundenMaster] with(nolock)) 
--and kkunde= 203

UNION ALL

select 
	kKunde, 
	cNotiz as Detay
from [Kunde].[tNotiz] as N with(nolock)
where 1=1
--and N.kKunde in (select kKunde from [Custom].[MieteKundenMaster] with(nolock)) 
and N.nTyp = 0
--and kkunde= 203

GO
