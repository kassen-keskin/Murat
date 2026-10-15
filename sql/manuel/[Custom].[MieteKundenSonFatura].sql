ALTER VIEW [Custom].[MieteKundenSonFatura] as
select 
	R.kKunde, 
	max(R.kRechnung) as kRechnungSon
from Rechnung.tRechnung					as R with(nolock) 
INNER JOIN Rechnung.tRechnungPosition	as RP with(nolock) on RP.kRechnung = R.kRechnung
where 1=1--RP.cArtNr > 0
and RP.cName like '%Kassenmiete%'
and R.kKunde in ( select kKunde from [Custom].[MieteKundenMaster] as CM with(nolock))
group by R.kKunde
GO


