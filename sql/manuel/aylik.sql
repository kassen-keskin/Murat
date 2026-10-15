select 	
	R.cRechnungsnr,
	Z.dDatum as Odeme,
	R.dErstellt as Fatura,
	R.cKundennr, 
	K.cFirma, 
	ZA.cName as ZahlungArt,
    replace(cast(cast(sum(Z.fBetrag) as decimal(13,2)) as nvarchar), '.', ',') as Zahlung
from tZahlung							as Z  with(nolock)
INNER JOIN Rechnung.tRechnung			as R  with(nolock) on R.kRechnung	= Z.kRechnung
INNER JOIN Kunde.lvKunde				as K  with(nolock) on R.kKunde		= K.kKunde
INNER JOIN tZahlungsart					as ZA  with(nolock) on ZA.kZahlungsart = Z.kZahlungsart
where  Z.dDatum between cast('2026-08-01 00:00:00.000' as date)  and cast('2026-09-01 00:00:00.000' as date)
and  R.dErstellt < cast('2026-08-01 00:00:00.000' as date)
--and ZA.cName = 'Bar'
--and R.cRechnungsnr <> 'EK-2025-11505'
group by R.cRechnungsnr,Z.dDatum,R.cKundennr, K.cFirma, ZA.cName,R.dErstellt
order by Z.dDatum
/*
select 	
	ZA.cName as ZahlungArt,
	 replace(cast(cast(sum(Z.fBetrag) as decimal(13,2)) as nvarchar), '.', ',') as Zahlung
from tZahlung							as Z  with(nolock)
INNER JOIN Rechnung.tRechnung			as R  with(nolock) on R.kRechnung	= Z.kRechnung
INNER JOIN Kunde.lvKunde				as K  with(nolock) on R.kKunde		= K.kKunde
INNER JOIN tZahlungsart					as ZA  with(nolock) on ZA.kZahlungsart = Z.kZahlungsart
where  Z.dDatum between cast('2026-07-10 00:00:00.000' as date)  and cast('2026-08-01 00:00:00.000' as date)
--and ZA.cName = 'Bar'
--and R.cRechnungsnr <> 'EK-2025-11505'
group by  ZA.cName
*/