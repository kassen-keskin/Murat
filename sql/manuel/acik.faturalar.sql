select 	
	R.cRechnungsnr,	
	CONVERT(date, R.dErstellt, 105) as dErstellt,
	R.cKundennr, 
	K.cFirma,	
	replace(cast(cast(RE.fOffenerWert as decimal(13,2)) as nvarchar), '.', ',')
from Rechnung.tRechnung			as R  with(nolock) 
INNER JOIN Kunde.lvKunde				as K  with(nolock) on R.kKunde		= K.kKunde
INNER JOIN Rechnung.tRechnungEckdaten	as RE with(nolock) on R.kRechnung	= RE.kRechnung
where  RE.fOffenerWert > 0
and  R.dErstellt < cast('2025-11-01 00:00:00.000' as date)
order by K.cFirma, R.cRechnungsnr

select 	
	sum(RE.fOffenerWert)
from Rechnung.tRechnung			as R  with(nolock) 
INNER JOIN Kunde.lvKunde				as K  with(nolock) on R.kKunde		= K.kKunde
INNER JOIN Rechnung.tRechnungEckdaten	as RE with(nolock) on R.kRechnung	= RE.kRechnung
where  RE.fOffenerWert > 0
and  R.dErstellt < cast('2025-11-01 00:00:00.000' as date)
--order by K.cFirma, R.cRechnungsnr --25,245.93
