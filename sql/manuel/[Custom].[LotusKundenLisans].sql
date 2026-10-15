--ALTER VIEW [Custom].[LotusKundenLisans] as
select 
    kKunde, --KundeID
	cKundenNr as KundenNr,
	cFirma as Firma,
	cVorname + ' ' + cName as InhabeName,
	cStrasse as Strasse,
	cPLZ as PLZ,
	(	select top 1 KEF.cWertVarchar 
		from [Kunde].[tKundeEigenesFeld] as KEF with(nolock) 
		where KEF.kAttribut = 229 --Lizenz Nr.
		and KEF.kKunde = K.kKunde
    ) as LisansNo,
	(	select top 1 KEF.cWertVarchar 
		from [Kunde].[tKundeEigenesFeld] as KEF with(nolock) 
		where KEF.kAttribut = 228 --Lizenz Nr.
		and KEF.kKunde = K.kKunde
    ) as Versiyon
from Kunde.lvKunde				as K  with(nolock)
where kKundenKategorie = 9
GO