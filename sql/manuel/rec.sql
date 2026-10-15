
select 
R.kKunde, R.cKundennr,R.kRechnung,*
--update R set 
--R.kKunde = 9547,
--R.cKundennr = '2564'
from Rechnung.tRechnung as R
LEFT OUTER JOIN Kunde.lvKunde as K on R.kKunde = K.kKunde
LEFT OUTER JOIN Rechnung.tRechnungEckdaten as RE on R.kRechnung = RE.kRechnung
where 1 =1 
--and R.kRechnung between 1165 and 1236
--R.dErstellt between cast('2025-05-12 00:00:00.000' as date)  and cast('2025-05-13 01:01:00.000' as date)
and R.cRechnungsnr = 'EK-2026-13418'
--R.dErstellt between cast('2025-05-12 00:00:00.000' as date)  and cast('2025-05-12 01:01:00.000' as date)
--and RE.dBezahlt is not null
--and R.cZahlungsart ='Rechnung'
--group by R.kRechnung,R.kKunde,R.cRechnungsnr,R.dErstellt,R.cKundennr, K.cFirma
--and R.kRechnung = 1183
order by R.kRechnung-- R.dErstellt 

select *
from Rechnung.tRechnungPosition as RP
where RP.kRechnung  = 3453
and RP.kRechnungPosition = 13718

select * from Rechnung.tRechnungEckdaten
where kRechnung = 1183
select *

update RP set
RP.cName = 'LaCash-Update'
/*
fMwSt = 19 ,
fVkNetto = 69,
fWertNettoGesamtFixiert = 69,
fWertBruttoGesamtFixiert =82.11
*/
from Rechnung.tRechnungPosition as RP
where RP.kRechnung  = 3453
and RP.kRechnungPosition = 13718

--select * from Kunde.lvKunde where kKunde = 9547 order by kKunde desc
/*

select 
--R.kRechnung,R.kKunde,R.cRechnungsnr,R.dErstellt,R.cKundennr, K.cFirma,
sum(RE.fZahlung) as fZahlung
from Rechnung.tRechnung as R
LEFT OUTER JOIN Kunde.lvKunde as K on R.kKunde = K.kKunde
LEFT OUTER JOIN Rechnung.tRechnungEckdaten as RE on R.kRechnung = RE.kRechnung
where R.dErstellt between cast('2024-06-01 00:00:00.000' as date)  and getdate()
and RE.dBezahlt is not null

select * from Rechnung.tRechnung
select * from Rechnung.tRechnungAdresse
select * from Rechnung.tRechnungAusgabeDateien
select * from Rechnung.tRechnungEckdaten
select * from Rechnung.tRechnungFile
select * from Rechnung.tRechnungKorrektur
select * from Rechnung.tRechnungLieferscheinPosition

select * from tArtikel where kArtikel = 1314
select * from tArtikelBeschreibung where kArtikel = 1314

select * from tArtikel where kArtikel = 1336
select * from tArtikelBeschreibung where kArtikel = 1336

select * 
--update RP set cArtNr = 338, kArtikel = 1336 , cName = 'Olympia K200 Plus'
from Rechnung.tRechnungPosition as RP
where kRechnung = 115 and cArtNr = 316

select * from Rechnung.tRechnungPositionEckdaten
select * from Rechnung.tRechnungPositionEigenschaft
select * from Rechnung.tRechnungPositionFile
select * from Rechnung.tRechnungPositionTeilmengen
select * from Rechnung.tRechnungPositionTeilmengenKonfiguration
select * from Rechnung.tRechnungPositionText

select * from Rechnung.tRechnungStorno
select * from Rechnung.tRechnungStornogrund
select * from Rechnung.tRechnungText
select * from Rechnung.tRechnungZahlungsinfo
*/