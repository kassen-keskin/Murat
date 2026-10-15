select 
('"Branchen";"Kundengruppen";"Matchcode";"Kundennummer";"Firma";"Straﬂe";"HausNr";"Anrede";"Name";"Vorname";"Telefon";"Telefon 2";"Web";"EMAIL";"Ort";"Postleitzahl"')
union all
(
select 
  isNULL( KundenKategorie,'')       + ';'
+ isNULL( KundenGruppe,'')       + ';'
+ isNULL( cFirma,'')       + ';'
+ isNULL( cKundenNr,'')       + ';'
+ isNULL( cFirma,'')       + ';'
+ isNULL( cStrasse,'')       + ';'
+ isNULL( cStrasse,'')       + ';'
+ isNULL( cAnrede,'')       + ';'
+ isNULL( cName,'')       + ';'
+ isNULL( cVorname,'')       + ';'
+ isNULL( cTel,'')       + ';'
+ isNULL( cMobil,'')       + ';'
+ isNULL( cWWW,'')       + ';'
+ isNULL( cEMail,'')       + ';'
+ isNULL( cOrt,'')       + ';'
+ isNULL( cPLZ,'')       + ';'
from Kunde.lvKunde as K  with(nolock)
 
) 