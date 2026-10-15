select 
K.cKundenNr as ["Kunden-Nr."],
'' as Anrede,
K.cFirma as Titel,
K.cName as Nachname,
K.cVorname as Vorname,
(
case isNULL(K.cVorname,'')
	when ''  then  K.cFirma 
	else ''
end
) as Organisation,
K.cAdressZusatz as Namenszusatz,
'' as Position ,
'Kunde' as Kategorie,
'' as IBAN,
'' as BIC,
K.cUSTID as [UmSt.-ID],
K.cStrasse as Strasse,
K.cPLZ as PLZ,
K.cOrt as Ort,
K.cLand as Land,
'Arbeit' as [Adresse-Kategorie],
K.cTel as Telefon,
'Arbeit' as [Telefon-Kategorie],
K.cMobil as Mobil,
K.cFax as Fax,
K.cEMail as [E-Mail],
'Arbeit' as [E-Mail-Kategorie],
'https://my.anydesk.com/clients/' + trim(K.cWWW) as Webseite,
'Arbeit' as [Webseite-Kategorie],
K.KundenKategorie as Beschreibung,

CONVERT(VARCHAR, K.dErstellt, 104) as Geburtstag,

K.cFirma as Tags,
'' as [Debitoren-Nr.],
'' as [Kreditoren-Nr.],
'' as [Leitweg-ID / Leitwegsnummer],
K.cUSTID as [Steuernummer],
'' as [Skonto Tage],
'' as [Skonto Prozent],
'' as [Zahlungsziel Tage],
'' as [Ist Kundenrabatt prozentual]

,*
from Kunde.lvKunde as K 



--select * 
--FROM [Kunde].[tKundeEigenesFeld] as KEF
--LEFT OUTER JOIN [dbo].[tAttributSprache] as ATS ON ATS.kAttribut = KEF.kAttribut
--LEFT OUTER JOIN .Kunde.lvKunde as K ON K.kKunde = KEF.kKunde
