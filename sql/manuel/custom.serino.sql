--ALTER VIEW [Custom].[SeriNo] AS
select 
	R.cRechnungsnr as Rechnung,
	R.dErstellt as RechnungDate,
	ART.kArtikel as Artikel,
	ART.cSeriennr as ArtikelSeriNo,
	AB.cName as ArtikelName,
	A.cKundenNr as KundenNo,
	K.cFirma as KundenFirma, 
	K.cName + ' ' + K.cVorname as KundenName,
	K.kKunde
from Verkauf.vAuftrag as A with(nolock)
INNER JOIN tPicklistePos as LIST with(nolock) ON A.kAuftrag = LIST.kBestellung  
INNER JOIN tLagerartikel as ART with(nolock) ON ART.kBestellPos = LIST.kBestellPos and ART.kArtikel = LIST.kArtikel
INNER JOIN Kunde.lvKunde as K with(nolock) ON K.kKunde = A.kKunde
INNER JOIN tArtikel as AR with(nolock) ON AR.kArtikel = ART.kArtikel
INNER JOIN tArtikelBeschreibung as ab with(nolock) on AR.kArtikel = ab.kArtikel
INNER JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on A.cAuftragsNr = RE.cAuftragsnummern
INNER JOIN Rechnung.tRechnung as R with(nolock) on R.kRechnung = RE.kRechnung
where ART.cSeriennr is not null

UNION ALL

select 
	R.cRechnungsnr as Rechnung,
	R.dErstellt as RechnungDate,
	AR.kArtikel as Artikel,
	'ELSTER' as ArtikelSeriNo,
	AB.cName as ArtikelName,
	A.cKundenNr as KundenNo,
	K.cFirma as KundenFirma, 
	K.cName + ' ' + K.cVorname as KundenName,
	K.kKunde
from Verkauf.vAuftrag as A with(nolock)
INNER JOIN Kunde.lvKunde as K with(nolock) ON K.kKunde = A.kKunde
INNER JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on A.cAuftragsNr = RE.cAuftragsnummern
INNER JOIN Rechnung.tRechnung as R with(nolock) on R.kRechnung = RE.kRechnung
INNER JOIN Verkauf.lvRechnungsposition as RP with(nolock) on R.kRechnung = RP.kRechnung
INNER JOIN tArtikel as AR with(nolock) ON AR.kArtikel = RP.kArtikel
INNER JOIN tArtikelBeschreibung as ab with(nolock) on AR.kArtikel = ab.kArtikel
where RP.cName like '%Elster%'
GO


