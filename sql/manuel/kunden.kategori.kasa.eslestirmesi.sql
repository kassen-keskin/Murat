select 	
	TK.kKundenKategorie, K.KundenKategorie,K.cKundenNr, K.cFirma, AB.cName,k.cTel,k.cMobil
	--,KS.cName,Kt.kKategorie
--update TK set TK.kKundenKategorie = 10
from tkunde as TK 
--INNER JOIN tPicklistePos as LIST with(nolock) ON A.kAuftrag = LIST.kBestellung  
--INNER JOIN tLagerartikel as ART with(nolock) ON ART.kBestellPos = LIST.kBestellPos and ART.kArtikel = LIST.kArtikel
INNER JOIN Verkauf.vAuftrag as A with(nolock) ON TK.kKunde = A.kKunde
INNER JOIN Kunde.lvKunde as K with(nolock) ON K.kKunde = A.kKunde
INNER JOIN Rechnung.tRechnungEckdaten as RE with(nolock) on A.cAuftragsNr = RE.cAuftragsnummern
INNER JOIN Rechnung.tRechnung as R with(nolock) on R.kRechnung = RE.kRechnung
INNER JOIN Rechnung.tRechnungPosition as RP with(nolock) on R.kRechnung = RP.kRechnung
INNER JOIN tArtikel as AR with(nolock) ON AR.kArtikel = RP.kArtikel
INNER JOIN tArtikelBeschreibung as ab with(nolock) on AR.kArtikel = ab.kArtikel
INNER JOIN tkategorieartikel as ka on ar.kArtikel = ka.kArtikel--ka.kKategorie = K.kKategorie
INNER JOIN tKategorieSprache as ks on ks.kKategorie = ka.kKategorie
INNER JOIN tkategorie as KT on Ka.kKategorie = kt.kKategorie
where 1=1
--and AB.cName like  '%lacash%'
--and K.kKundenKategorie = 0 
and KT.kKategorie in ( 
	0
	--,101		--Noris.ok					
	--,44		--Olympia cm 941
	--,95		--Olympia K-Android
	--,59		--Olympia Touch 200
	--,71		--PosProm
	--,91		--Primasello Kassen
	--,28		--Prox
	--,51		--QMP 50
	--,109		--QMP 60
	--,39		--QMP-Touch
	--,85		--Quorion
	--,63		--RCH-TOUCHKASSEN
	--,89		--Sampos
	--,10		--SamPOS-Kassen
	--,82		--Sharpkassen.ok
	--,8		--x-a Kassen Sharp.ok
	--,20		--Sunmi
	--,3		--Elo
	--,30,31,35	--lacash
)

order by K.cKundenNr

/*
select KS.cName,KT.kKategorie, ab.cName
from tkategorie as KT
INNER JOIN tkategorieartikel as ka on ka.kKategorie = KT.kKategorie
INNER JOIN tKategorieSprache as ks on ks.kKategorie = ka.kKategorie
INNER JOIN tArtikel as AR with(nolock) ON AR.kArtikel = KA.kArtikel
INNER JOIN tArtikelBeschreibung as ab with(nolock) on AR.kArtikel = ab.kArtikel
where 1=1
and KT.kKategorie in ( 
	 101	--Noris
	,44		--Olympia cm 941
	,95		--Olympia K-Android
	,59		--Olympia Touch 200
	,71		--PosProm
	,91		--Primasello Kassen
	,28		--Prox
	,51		--QMP 50
	,109	--QMP 60
	,39		--QMP-Touch
	,85		--Quorion
	,63		--RCH-TOUCHKASSEN
	,89		--Sampos
	,10		--SamPOS-Kassen
	,82		--Sharpkassen
	,8		--x-a Kassen Sharp
	,20		--Sunmi
	,3		--Elo
)
order by KS.cName, ab.cName

*/

/*
ALTER TABLE tkunde DISABLE TRIGGER tgr_tKunde_DEL
ALTER TABLE tkunde DISABLE TRIGGER tgr_tKunde_INSUP
ALTER TABLE tkunde DISABLE TRIGGER tgr_tKunde_INSUPDEL

ALTER TABLE tkunde ENABLE TRIGGER tgr_tKunde_DEL
ALTER TABLE tkunde ENABLE TRIGGER tgr_tKunde_INSUP
ALTER TABLE tkunde ENABLE TRIGGER tgr_tKunde_INSUPDEL
*/
