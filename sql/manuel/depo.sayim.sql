/*
select * from tArtikel where cArtNr = 244
select * from tArtikelBeschreibung where kArtikel = 243
select * from tlagerbestand where kArtikel = 243
select * from tkategorie as k
select * from tkategorieartikel as ka
select * from tKategorieSprache as kg
*/

select 
k.kOberKategorie, kgo.cName as OberKategorieName,
ka.kKategorie, kg.cName as Kategori,
ka.kArtikel,ab.cName as Artikel,
cast(a.fVKNetto as decimal(8,2)) as fVKNettoas,cast(a.fEKNetto as decimal(8,2)) as fEKNetto,a.cHAN, cast(alb.fLagerbestand as int) as fLagerbestand,--alb.fVerfuegbar,alb.fLagerbestandEigen,alb.fInAuftraegen,
al.cSeriennr, cast(al.fEK as decimal(8,2)) as fEK, al.kBestellPos, al.kLieferscheinPos, al.kPicklistePos
from tkategorieartikel as ka
LEFT OUTER JOIN tArtikel as a on a.kArtikel = ka.kArtikel
LEFT OUTER JOIN tArtikelBeschreibung as ab on a.kArtikel = ab.kArtikel
LEFT OUTER JOIN tkategorie as k on k.kKategorie = ka.kKategorie
LEFT OUTER JOIN tKategorieSprache as kg on kg.kKategorie = k.kKategorie
LEFT OUTER JOIN tKategorieSprache as kgo on kgo.kKategorie = k.kOberKategorie
LEFT OUTER JOIN tLagerArtikel as al on al.kArtikel = a.kArtikel
LEFT OUTER JOIN tlagerbestand as alb on alb.kArtikel = a.kArtikel
where ka.kKategorie not in (
23,--Kassenmiete
53,--Blitzkasse
61,--Update

98,--Extra Module						11	LP-Lotus
13,--Kassensoftware						11	LP-Lotus
14,--Kassenmodule						11	LP-Lotus

15,--Dienstleistung
16,--Pc-Kassen-Einstellung				15	Dienstleistung
17,--Registrierkassen-Einstellung-Progr	15	Dienstleistung
18,--Wartung/Einstellung				15	Dienstleistung

30,--LaCash Modüle						12	LaCash
31,--LaCashSoftware						12	LaCash
35,--LaCashUpdate						12	LaCash

0
)
order by k.kOberKategorie,ka.kKategorie,ab.cName
