ALTER VIEW [Custom].[MieteKundenMaster] as
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
	(	select top 1 KEF.cWertVarchar 
		from [Kunde].[tKundeEigenesFeld] as KEF with(nolock) 
		where KEF.kAttribut = 229 --Lizenz Nr.
		and KEF.kKunde = K.kKunde
    ) as LisansNo,
	KundenKategorie,
	KundenGruppe,
	(	select top 1 1 
		from [Custom].[KundenAttribut] as KA with(nolock) 
		where KA.kAttribut = 235 --ELSTER
		and KA.kKunde = K.kKunde
    ) as Elster,
	(
		select top 1 TK.TamKontrolTarihi
		from [Custom].[KundenTamKontrolTarihi] as TK with(nolock)
		where TK.kKunde = K.kKunde
		order by TK.TamKontrolTarihi desc
	) as TamKontrolTarihi,

	(	select 
			case 
			when KA.Detay like '%1.Teklif gönderildi%'	then 1
			when KA.Detay like '%2.Faturasi Ödendi%'	then 2
			else 0
			end
		from [Custom].[KundenAttribut] as KA with(nolock) 
		where KA.kAttribut = 245  --Servis Durumu
		and KA.kKunde = K.kKunde
    ) as Servis,

    (
		select top 1 TB.TSEBitisTarihi
		from [Custom].[KundenTSEBitisTarihi] as TB with(nolock)
		where TB.kKunde = K.kKunde
		order by TB.TSEBitisTarihi desc
	) as TSEBitisTarihi,

    (
		select top 1 EC.EcCihazi
		from [Custom].[KundenEcCihazi] as EC with(nolock)
		where EC.kKunde = K.kKunde

	) as EcCihazi   

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
	(	select top 1 KEF.cWertVarchar 
		from [Kunde].[tKundeEigenesFeld] as KEF with(nolock) 
		where KEF.kAttribut = 229 --Lizenz Nr.
		and KEF.kKunde = K.kKunde
    ) as LisansNo,
	KundenKategorie,
	KundenGruppe,
	(	select top 1 1 
			from [Custom].[KundenAttribut] as KA with(nolock) 
			where KA.kAttribut = 235 --ELSTER
			and KA.kKunde = K.kKunde
	 ) as Elster,
	(
		select top 1 TK.TamKontrolTarihi
		from [Custom].[KundenTamKontrolTarihi] as TK with(nolock)
		where TK.kKunde = K.kKunde
		order by TK.TamKontrolTarihi desc
	) as TamKontrolTarihi,

	(	select 
			case 
			when KA.Detay like '%1.Teklif gönderildi%'	then 1
			when KA.Detay like '%2.Faturasi Ödendi%'	then 2
			else 0
			end
		from [Custom].[KundenAttribut] as KA with(nolock) 
		where KA.kAttribut = 245  --Servis Durumu
		and KA.kKunde = K.kKunde
    ) as Servis,

    (
		select top 1 TB.TSEBitisTarihi
		from [Custom].[KundenTSEBitisTarihi] as TB with(nolock)
		where TB.kKunde = K.kKunde
		order by TB.TSEBitisTarihi desc
	) as TSEBitisTarihi,

    (
		select top 1 EC.EcCihazi
		from [Custom].[KundenEcCihazi] as EC with(nolock)
		where EC.kKunde = K.kKunde

	) as EcCihazi   

from Kunde.lvKunde				as K  with(nolock)
where KundenGruppe = 'Kunden' 
and K.kKunde in 
(
 select kKunde 
 from [Custom].[KundenAttribut]  with(nolock) 
 where kAttribut = 236 --Dashboard
)
GO


