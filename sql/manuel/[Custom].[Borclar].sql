Create View [Custom].[Borclar] as
select
	k.kKunde,	
	CONVERT(VARCHAR, cast(sum(RE.fOffenerWert) as decimal(13,2)), 104) as BorcToplami,
	min(case when RE.dZahlungsziel is not null then RE.dZahlungsziel else R.dErstellt end) as BorcTarihi,
	DATEDIFF(DAY,min(case when RE.dZahlungsziel is not null then RE.dZahlungsziel else R.dErstellt end), getdate()) as BorcTarihiGunSayisi
from Rechnung.tRechnung			as R with(nolock) 
INNER JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on RE.kRechnung = R.kRechnung
INNER JOIN Kunde.lvKunde		as K  with(nolock) on R.kKunde		= K.kKunde
where RE.fOffenerWert > 0
group by k.kKunde
--order by k.kKunde desc