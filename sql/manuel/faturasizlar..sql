--ALTER view [Custom].[SatilanKasalarSeriKodlu] as 
select 
	A.cAuftragsNr,
	A.dErstellt,
	K.cKundenNr,
	K.cFirma,
	K.cName + '-' + K.cVorname,
	R.cRechnungsnr,
	AE.fWertNetto,
	AE.fWertBrutto,
	AE.dBezahlt,
	AE.fOffenerWert,
	AE.fOffenerWertOhneStorno
from Verkauf.vAuftrag as A with(nolock)
INNER JOIN [Verkauf].[vAuftragEckdaten] as AE with(nolock) ON A.kAuftrag = AE.kAuftrag
--INNER JOIN tPicklistePos as LIST with(nolock) ON A.kAuftrag = LIST.kBestellung  
--INNER JOIN tLagerartikel as ART with(nolock) ON ART.kBestellPos = LIST.kBestellPos and ART.kArtikel = LIST.kArtikel
INNER JOIN Kunde.lvKunde as K with(nolock) ON K.kKunde = A.kKunde
--INNER JOIN tArtikel as AR with(nolock) ON AR.kArtikel = ART.kArtikel
--INNER JOIN tArtikelBeschreibung as ab with(nolock) on AR.kArtikel = ab.kArtikel
LEFT OUTER JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on A.cAuftragsNr = RE.cAuftragsnummern
LEFT OUTER JOIN Rechnung.tRechnung as R with(nolock) on R.kRechnung = RE.kRechnung
where 1=1
and ISNULL(R.cRechnungsnr,'') = ''
and A.cAuftragsNr like 'AU-%'
and K.cKundenNr not in (5,7,8, 9, 2390)
order by K.cFirma