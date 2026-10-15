--1. seri kodlu cihaz satislari
--alter view [Custom].[SatilanKasalarSeriKodlu] as 
select 
	--R.cRechnungsnr as Rechnung,
	--R.dErstellt as RechnungDate,
	--ART.kArtikel as Artikel,
	ART.cSeriennr as ArtikelSeriNo,
	--sum((case when isNULL(ART.cSeriennr,'') = '' then 0 else 1 end) )as SeriNoSayisi,
	--AB.cName as ArtikelName,
	--A.cKundenNr as KundenNo,
	--K.cFirma as KundenFirma, 
	--K.cName + ' ' + K.cVorname as KundenName,
	K.kKunde
	--ART.kPicklistePos,
	--kWarenLagerEingang
from Verkauf.vAuftrag as A with(nolock)
INNER JOIN tPicklistePos as LIST with(nolock) ON A.kAuftrag = LIST.kBestellung  
INNER JOIN tLagerartikel as ART with(nolock) ON ART.kBestellPos = LIST.kBestellPos and ART.kArtikel = LIST.kArtikel
INNER JOIN Kunde.lvKunde as K with(nolock) ON K.kKunde = A.kKunde
INNER JOIN tArtikel as AR with(nolock) ON AR.kArtikel = ART.kArtikel
INNER JOIN tArtikelBeschreibung as ab with(nolock) on AR.kArtikel = ab.kArtikel
INNER JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on A.cAuftragsNr = RE.cAuftragsnummern
INNER JOIN Rechnung.tRechnung as R with(nolock) on R.kRechnung = RE.kRechnung
where 1=1
and AB.cName in (select S.ArtName from [Custom].[SatilanKasalar] as S with(nolock))
--and K.kKunde = 9879
group by 	K.kKunde, ART.cSeriennr
--order by K.kKunde, ART.cSeriennr


--2.satilan kasalar serikodu olsun yada olmasin
--ALTER view [Custom].[SatilanKasalar] as 
select 
	RP.cName as ArtName,
	k.kKunde
from Rechnung.tRechnung as R with(nolock)
INNER JOIN Kunde.lvKunde as K with(nolock) on R.kKunde = K.kKunde
INNER JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on R.kRechnung = RE.kRechnung
INNER JOIN Rechnung.tRechnungPosition as RP with(nolock) on RP.kRechnung = R.kRechnung
where 1=1
--and K.kKunde = 9879
and RP.cArtNr in (
'349','350','358','373','396','400','404','418','424','428','316','327','338'
,'42','58','170','207','214','288','296','297','375','376'
,'183','196'
,'3'
,'386','387','388','389','397', '384'
,'235'
,'286', '300'
,'467'
)
--and K.cKundenNr = '2584'
--order by R.dErstellt desc



--3.elsteri i yapilan musterileriler
--ALTER view [Custom].[ElsteriYapilanlar] as
select 
	count(RP.cName) as ElsterSayisi,
	K.kKunde
from Verkauf.vAuftrag as A with(nolock)
INNER JOIN Kunde.lvKunde as K with(nolock) ON K.kKunde = A.kKunde
INNER JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on A.cAuftragsNr = RE.cAuftragsnummern
INNER JOIN Rechnung.tRechnung as R with(nolock) on R.kRechnung = RE.kRechnung
INNER JOIN Verkauf.lvRechnungsposition as RP with(nolock) on R.kRechnung = RP.kRechnung
INNER JOIN tArtikel as AR with(nolock) ON AR.kArtikel = RP.kArtikel
INNER JOIN tArtikelBeschreibung as ab with(nolock) on AR.kArtikel = ab.kArtikel
where RP.cName like '%Elster%'
--and K.kKunde = 9879
group by K.kKunde

