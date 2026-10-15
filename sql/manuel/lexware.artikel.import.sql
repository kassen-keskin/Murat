select 

('"Warengruppe";"Warengr.-Kurzbez.";"Matchcode";"Artikelnummer";"Bezeichnung";"Preis 1"' )

union all

(
SELECT
        (KS.cName)                              + ';'
      + (KS.cName)                              + ';'
      + CONVERT(VARCHAR, A.kArtikel, 104)       + ';'
      + CONVERT(VARCHAR,A.Artikelnummer, 104)	+ ';'
      + (A.Artikelname)					        + ';'
      + CONVERT(VARCHAR, cast( A.VerkaufspreisNetto as decimal(13,2)), 104) + ';'      
  FROM [ArtikelVerwaltung].[vArtikelliste] as A
  INNER JOIN tkategorieartikel as KA ON A.kArtikel = KA.kArtikel
  INNER JOIN tKategorieSprache as KS ON KS.kKategorie = KA.kKategorie
) 