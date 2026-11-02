ALTER VIEW [Custom].[FaturasizSiparisler] AS
select 
	RE.kRechnung as Rechnung,
	A.cAuftragsNr as Auftrag,
	A.dErstellt as AuftragDate,	
	CONVERT(VARCHAR, cast(sum(AE.fOffenerWert) as decimal(13,2)), 104) as BorcToplami,
	A.cKundenNr as KundenNo,
	K.kKunde,
	K.Firma,
	K.FirmaAdress,
	K.InhabeName
	
from Verkauf.vAuftrag as A with(nolock)
INNER JOIN [Custom].[Kunde] as K with(nolock) ON K.kKunde = A.kKunde
INNER JOIN Verkauf.tAuftragEckdaten as AE  with(nolock) on A.kAuftrag = AE.kAuftrag
LEFT JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on A.cAuftragsNr = RE.cAuftragsnummern
where 1 = 1
and A.cAuftragsNr like 'AU-%'
and ISNULL(RE.kRechnung, '') = ''
and A.cKundenNr > 10
group by 
	RE.kRechnung,
	A.cAuftragsNr,
	A.dErstellt,
	A.cKundenNr,
	K.kKunde,
	K.Firma,
	K.FirmaAdress,
	K.FirmaStrasse,
	K.InhabeName
--order by A.dErstellt desc
