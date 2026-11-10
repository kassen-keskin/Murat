--ALTER VIEW [Custom].[AcikFaturalar] AS
select 
	RE.kRechnung as Rechnung,
	R.cRechnungsnr as BelgeNo,
	R.dErstellt as BelgeTarigi,	
	CONVERT(VARCHAR, cast(sum(RE.fOffenerWert) as decimal(13,2)), 104) as BorcToplami,
	R.cKundenNr as KundenNo,
	K.kKunde,
	K.Firma,
	K.FirmaAdress,
	K.InhabeName
from Rechnung.tRechnung			as R with(nolock) 
INNER JOIN [Custom].[Kunde] as K with(nolock) ON K.kKunde = R.kKunde
INNER JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on RE.kRechnung = R.kRechnung
where 1 = 1
and R.cKundenNr > 10
and RE.fOffenerWert > 0
and K.kKundenGruppe = 1
group by 
	RE.kRechnung,
	R.cRechnungsnr,
	R.dErstellt,
	R.cKundenNr,
	K.kKunde,
	K.Firma,
	K.FirmaAdress,
	K.FirmaStrasse,
	K.InhabeName
--order by A.dErstellt desc