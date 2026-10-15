--ALTER VIEW [Custom].[MieteKundenMaster] as
select 
    kKunde, --KundeID
	cKundenNr as KundenNr,
	cFirma as Firma,
	cVorname + ' ' + cName as InhabeName,
	cTel as Tel,
	cMobil as Mobil,
	cStrasse as Strasse,
	cPLZ as PLZ,
	cWWW as AnyDesk,
	KundenKategorie,
	KundenGruppe,
	(	select top 1 1 
		from [Custom].[KundenAttribut] as KA with(nolock) 
		where KA.kAttribut = 235 --ELSTER
		and KA.kKunde = K.kKunde
    ) as Elster
from Kunde.lvKunde				as K  with(nolock)
where KundenGruppe <> 'Kunden'

UNION ALL

select --Dashboard secili olanlar
    kKunde, --KundeID
	cKundenNr as KundenNr,
	cFirma as Firma,
	cVorname + ' ' + cName as InhabeName,
	cTel as Tel,
	cMobil as Mobil,
	cStrasse as Strasse,
	cPLZ as PLZ,
	cWWW as AnyDesk,
	KundenKategorie,
	KundenGruppe,
	(	select top 1 1 
			from [Custom].[KundenAttribut] as KA with(nolock) 
			where KA.kAttribut = 235 --ELSTER
			and KA.kKunde = K.kKunde
	 ) as Elster
from Kunde.lvKunde				as K  with(nolock)
where KundenGruppe = 'Kunden' 
and K.kKunde in 
(
 select kKunde 
 from [Custom].[KundenAttribut]  with(nolock) 
 where kAttribut = 236 --Dashboard
)